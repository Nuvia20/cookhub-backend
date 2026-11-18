import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

const escapeSsml = (text) =>
  String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildResponse = (
  speech,
  { reprompt = null, endSession = false, sessionAttributes = null } = {}
) => ({
  version: '1.0',
  response: {
    outputSpeech: {
      type: 'SSML',
      ssml: `<speak>${escapeSsml(speech)}</speak>`,
    },
    ...(reprompt
      ? {
          reprompt: {
            outputSpeech: {
              type: 'SSML',
              ssml: `<speak>${escapeSsml(reprompt)}</speak>`,
            },
          },
        }
      : {}),
    shouldEndSession: endSession,
  },
  ...(sessionAttributes ? { sessionAttributes } : {}),
});

const getSlotValue = (intent, slotName) =>
  intent?.slots?.[slotName]?.value?.trim() || '';

const findRecipeByName = async (name) => {
  const normalizedName = normalizeText(name);

  if (!normalizedName) {
    return null;
  }

  const [recipes] = await pool.query(
    `SELECT id, titulo
     FROM recetas
     ORDER BY LENGTH(titulo) ASC`
  );

  return recipes.find((recipe) =>
    normalizeText(recipe.titulo).includes(normalizedName)
  ) || recipes.find((recipe) => {
    const title = normalizeText(recipe.titulo);
    return normalizedName.split(' ').some((word) => word.length > 2 && title.includes(word));
  }) || null;
};

const getRecipeDetails = async (recipeId) => {
  const [recipes] = await pool.query(
    `SELECT id, titulo, descripcion, tiempo_preparacion
     FROM recetas
     WHERE id = ?`,
    [recipeId]
  );

  if (recipes.length === 0) {
    return null;
  }

  const [ingredients] = await pool.query(
    `SELECT nombre, cantidad
     FROM ingredientes
     WHERE receta_id = ?
     ORDER BY id ASC`,
    [recipeId]
  );

  const [steps] = await pool.query(
    `SELECT paso_numero, descripcion
     FROM pasos
     WHERE receta_id = ?
     ORDER BY paso_numero ASC`,
    [recipeId]
  );

  return {
    ...recipes[0],
    ingredientes: ingredients,
    pasos: steps,
  };
};

const formatIngredients = (ingredients) =>
  ingredients
    .map((ingredient) =>
      ingredient.cantidad
        ? `${ingredient.cantidad} de ${ingredient.nombre}`
        : ingredient.nombre
    )
    .join(', ');

const formatSteps = (steps) =>
  steps
    .map((step, index) => `Paso ${index + 1}: ${step.descripcion}`)
    .join('. ');

router.get('/', (_req, res) => {
  res.json({ service: 'CookHub Alexa endpoint', status: 'ready' });
});

router.post('/', async (req, res) => {
  try {
    const envelope = req.body;
    const request = envelope?.request;

    if (!request) {
      return res.status(400).json(buildResponse('Solicitud inválida.'));
    }

    const expectedAppId = process.env.ALEXA_APP_ID;
    const receivedAppId = envelope?.session?.application?.applicationId;

    if (expectedAppId && receivedAppId !== expectedAppId) {
      return res.status(403).json(buildResponse('Esta Skill no está autorizada.'));
    }

    if (request.type === 'LaunchRequest') {
      return res.json(
        buildResponse(
          'Bienvenido a CookHub. Puedes pedirme una receta, sus ingredientes o sus pasos.',
          {
            reprompt: '¿Qué receta quieres buscar?',
          }
        )
      );
    }

    if (request.type === 'SessionEndedRequest') {
      return res.json(buildResponse('Hasta pronto.', { endSession: true }));
    }

    if (request.type !== 'IntentRequest') {
      return res.json(
        buildResponse('No pude procesar la solicitud.', { endSession: true })
      );
    }

    const intentName = request.intent?.name;
    const intent = request.intent;
    const sessionAttributes =
      envelope?.session?.attributes || {};

    if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
      return res.json(buildResponse('Hasta pronto.', { endSession: true }));
    }

    if (intentName === 'AMAZON.YesIntent') {
      const lastRecipeId = sessionAttributes.lastRecipeId;

      if (!lastRecipeId) {
        return res.json(
          buildResponse('Primero dime el nombre de una receta.', {
            reprompt: '¿Qué receta quieres consultar?',
          })
        );
      }

      const details = await getRecipeDetails(lastRecipeId);

      if (!details) {
        return res.json(buildResponse('Ya no pude encontrar esa receta.'));
      }

      if (details.ingredientes.length === 0) {
        return res.json(
          buildResponse(`${details.titulo} no tiene ingredientes registrados.`)
        );
      }

      return res.json(
        buildResponse(
          `Los ingredientes de ${details.titulo} son: ${formatIngredients(details.ingredientes)}.`,
          {
            reprompt: '¿Quieres escuchar los pasos?',
            sessionAttributes: {
              ...sessionAttributes,
              lastRecipeId: details.id,
            },
          }
        )
      );
    }

    if (intentName === 'AMAZON.NoIntent') {
      return res.json(
        buildResponse('Muy bien. ¿Qué otra cosa quieres consultar?', {
          reprompt: 'Puedes pedirme una receta o sus ingredientes.',
          sessionAttributes: {},
        })
      );
    }

    if (intentName === 'AMAZON.HelpIntent') {
      return res.json(
        buildResponse(
          'Puedes decir: dame una receta, dame los ingredientes de pastel, o los pasos de un platillo.',
          {
            reprompt: '¿Qué quieres cocinar?',
          }
        )
      );
    }

    if (intentName === 'RandomRecipeIntent') {
      const [recipes] = await pool.query(
        `SELECT id, titulo, tiempo_preparacion
         FROM recetas
         ORDER BY RANDOM()
         LIMIT 1`
      );

      if (recipes.length === 0) {
        return res.json(buildResponse('Todavía no hay recetas disponibles.'));
      }

      const recipe = recipes[0];
      const preparationTime = recipe.tiempo_preparacion
        ? ` El tiempo de preparación es ${recipe.tiempo_preparacion}.`
        : '';

      return res.json(
        buildResponse(
          `Te recomiendo ${recipe.titulo}.${preparationTime} ¿Quieres escuchar los ingredientes?`,
          {
            reprompt: 'Puedes pedirme los ingredientes.',
            sessionAttributes: {
              ...sessionAttributes,
              lastRecipeId: recipe.id,
            },
          }
        )
      );
    }

    if (
      intentName === 'RecipeIngredientsIntent'
      || intentName === 'RecipeStepsIntent'
    ) {
      const recipeName = getSlotValue(intent, 'recipeName');

      if (!recipeName) {
        return res.json(
          buildResponse('¿De qué receta quieres saber?', {
            reprompt: 'Dime el nombre de una receta.',
          })
        );
      }

      const recipe = await findRecipeByName(recipeName);

      if (!recipe) {
        return res.json(
          buildResponse(`No encontré una receta llamada ${recipeName}.`, {
            reprompt: 'Puedes decirme el nombre de otra receta.',
          })
        );
      }

      const details = await getRecipeDetails(recipe.id);

      if (!details) {
        return res.json(buildResponse(`No pude obtener ${recipe.titulo}.`));
      }

      if (intentName === 'RecipeIngredientsIntent') {
        if (details.ingredientes.length === 0) {
          return res.json(
            buildResponse(`${details.titulo} no tiene ingredientes registrados.`)
          );
        }

        return res.json(
          buildResponse(
            `Los ingredientes de ${details.titulo} son: ${formatIngredients(details.ingredientes)}.`,
            { reprompt: '¿Quieres escuchar los pasos?' }
          )
        );
      }

      if (details.pasos.length === 0) {
        return res.json(buildResponse(`${details.titulo} no tiene pasos registrados.`));
      }

      return res.json(
        buildResponse(
          `Los pasos para preparar ${details.titulo} son: ${formatSteps(details.pasos)}.`,
          { endSession: true }
        )
      );
    }

    if (intentName === 'AMAZON.FallbackIntent') {
      return res.json(
        buildResponse('Puedes pedirme una receta o consultar ingredientes y pasos.', {
          reprompt: '¿Qué necesitas?',
        })
      );
    }

    return res.json(
      buildResponse('Todavía no puedo realizar esa petición.', { endSession: true })
    );
  } catch (error) {
    console.error('Error en endpoint Alexa:', error);
    return res.status(500).json(
      buildResponse('Ocurrió un error al consultar CookHub.', { endSession: true })
    );
  }
});

export default router;
