
import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// ============================================
// UTILIDADES
// ============================================

// Normalizar texto para facilitar las búsquedas
const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Escapar caracteres especiales para SSML
const escapeSsml = (text) =>
  String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Construir respuesta de Alexa
const buildResponse = (
  speech,
  {
    reprompt = null,
    endSession = false,
    sessionAttributes = null,
  } = {}
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

// Obtener el valor de un slot
const getSlotValue = (intent, slotName) =>
  intent?.slots?.[slotName]?.value?.trim() || '';

// El adaptador de PostgreSQL devuelve [filas, metadata].
// Este helper también acepta el formato nativo pg por si cambia el adaptador.
const getRows = (result) =>
  Array.isArray(result) ? (result[0] || []) : (result?.rows || []);


// ============================================
// CONSULTAS A POSTGRESQL
// ============================================

// Buscar receta por nombre
const findRecipeByName = async (name) => {
  const normalizedName = normalizeText(name);

  if (!normalizedName) return null;

  const result = await pool.query(
    `SELECT id, titulo
     FROM recetas
     ORDER BY LENGTH(titulo) ASC`
  );

  const recipes = getRows(result);

  // Coincidencia completa o parcial
  return (
    recipes.find((recipe) =>
      normalizeText(recipe.titulo).includes(normalizedName)
    ) ||
    recipes.find((recipe) => {
      const title = normalizeText(recipe.titulo);

      return normalizedName
        .split(' ')
        .some((word) => word.length > 2 && title.includes(word));
    }) ||
    null
  );
};


// Obtener información completa de una receta
const getRecipeDetails = async (recipeId) => {

  const recipeResult = await pool.query(
    `SELECT id, titulo, descripcion, tiempo_preparacion
     FROM recetas
     WHERE id = ?`,
    [recipeId]
  );

  const recipes = getRows(recipeResult);

  if (recipes.length === 0) {
    return null;
  }

  const ingredientResult = await pool.query(
    `SELECT nombre, cantidad
     FROM ingredientes
     WHERE receta_id = ?
     ORDER BY id ASC`,
    [recipeId]
  );

  const stepsResult = await pool.query(
    `SELECT paso_numero, descripcion
     FROM pasos
     WHERE receta_id = ?
     ORDER BY paso_numero ASC`,
    [recipeId]
  );

  return {
    ...recipes[0],
    ingredientes: getRows(ingredientResult),
    pasos: getRows(stepsResult),
  };
};


// Obtener receta aleatoria
const getRandomRecipe = async () => {

  const result = await pool.query(
    `SELECT id, titulo, tiempo_preparacion
     FROM recetas
     ORDER BY RANDOM()
     LIMIT 1`
  );

  const recipes = getRows(result);
  return recipes[0] || null;
};


// ============================================
// FORMATEAR INFORMACIÓN
// ============================================

// Formatear ingredientes
const formatIngredients = (ingredients) =>
  ingredients
    .map((ingredient) =>
      ingredient.cantidad
        ? `${ingredient.cantidad} de ${ingredient.nombre}`
        : ingredient.nombre
    )
    .join(', ');


// Formatear pasos de preparación
const formatSteps = (steps) =>
  steps
    .map(
      (step, index) =>
        `Paso ${step.paso_numero || index + 1}: ${step.descripcion}`
    )
    .join('. ');


// ============================================
// RESPUESTAS DE RECETAS
// ============================================

// Mostrar ingredientes y preguntar por los pasos
const buildIngredientsResponse = (
  details,
  sessionAttributes = {}
) => {

  if (details.ingredientes.length === 0) {
    return buildResponse(
      `${details.titulo} no tiene ingredientes registrados.`,
      {
        sessionAttributes: {
          ...sessionAttributes,
          lastRecipeId: details.id,
          pendingAction: null,
        },
      }
    );
  }

  return buildResponse(
    `Te daré los ingredientes de ${details.titulo}. ` +
    `Los ingredientes son: ${formatIngredients(details.ingredientes)}. ` +
    `¿Quieres escuchar los pasos?`,
    {
      reprompt:
        'Puedes responder sí para escuchar los pasos, o no para terminar.',
      sessionAttributes: {
        ...sessionAttributes,
        lastRecipeId: details.id,
        pendingAction: 'steps',
      },
    }
  );
};


// Mostrar pasos de preparación
const buildStepsResponse = (
  details,
  sessionAttributes = {}
) => {

  if (details.pasos.length === 0) {
    return buildResponse(
      `${details.titulo} no tiene pasos registrados.`,
      {
        sessionAttributes: {
          ...sessionAttributes,
          lastRecipeId: details.id,
          pendingAction: null,
        },
      }
    );
  }

  return buildResponse(
    `Estos son los pasos para preparar ${details.titulo}. ` +
    `${formatSteps(details.pasos)}. ` +
    `¿Quieres consultar otra receta?`,
    {
      reprompt:
        'Puedes decir gracias para terminar o pedirme otra receta.',
      sessionAttributes: {
        ...sessionAttributes,
        lastRecipeId: details.id,
        pendingAction: 'newRecipe',
      },
    }
  );
};


// ============================================
// ENDPOINT DE ALEXA
// ============================================

// Verificar que el servicio esté disponible
router.get('/', (_req, res) => {
  res.json({
    service: 'CookHub Alexa endpoint',
    status: 'ready',
  });
});


// Procesar solicitudes de Alexa
router.post('/', async (req, res) => {

  try {

    const envelope = req.body;
    const request = envelope?.request;

    if (!request) {
      return res.status(400).json(
        buildResponse('Solicitud inválida.')
      );
    }

    // Validación de Alexa Skill ID
    const expectedAppId = process.env.ALEXA_APP_ID;
    const receivedAppId =
      envelope?.session?.application?.applicationId;

    if (
      expectedAppId &&
      receivedAppId !== expectedAppId
    ) {
      return res.status(403).json(
        buildResponse(
          'Esta Skill no está autorizada.',
          { endSession: true }
        )
      );
    }

    // ========================================
    // INICIO DE LA SKILL
    // ========================================

    if (request.type === 'LaunchRequest') {

      return res.json(
        buildResponse(
          'Bienvenido a CookHub. Puedes pedirme una receta por su nombre, consultar sus ingredientes o escuchar sus pasos.',
          {
            reprompt: '¿Qué receta quieres preparar?',
            sessionAttributes: {},
          }
        )
      );
    }

    if (request.type === 'SessionEndedRequest') {

      return res.json(
        buildResponse(
          'Hasta pronto.',
          { endSession: true }
        )
      );
    }

    if (request.type !== 'IntentRequest') {

      return res.json(
        buildResponse(
          'No pude procesar la solicitud.',
          { endSession: true }
        )
      );
    }

    const intentName = request.intent?.name;
    const intent = request.intent;

    const sessionAttributes =
      envelope?.session?.attributes || {};


    // ========================================
    // DETENER O CANCELAR
    // ========================================

    if (
      intentName === 'AMAZON.StopIntent' ||
      intentName === 'AMAZON.CancelIntent'
    ) {

      return res.json(
        buildResponse(
          'Hasta pronto. Espero que disfrutes tus recetas.',
          {
            endSession: true,
            sessionAttributes: {},
          }
        )
      );
    }


    // ========================================
    // AGRADECIMIENTO
    // ========================================

    if (intentName === 'ThankYouIntent') {

      return res.json(
        buildResponse(
          'Con gusto. Espero que disfrutes tu receta.',
          {
            endSession: true,
            sessionAttributes: {},
          }
        )
      );
    }


    // ========================================
    // RESPUESTA AFIRMATIVA
    // ========================================

    if (intentName === 'AMAZON.YesIntent') {

      const lastRecipeId =
        sessionAttributes.lastRecipeId;

      if (!lastRecipeId) {

        return res.json(
          buildResponse(
            'Primero dime el nombre de una receta.',
            {
              reprompt: '¿Qué receta quieres consultar?',
            }
          )
        );
      }

      const details =
        await getRecipeDetails(lastRecipeId);

      if (!details) {

        return res.json(
          buildResponse(
            'Ya no pude encontrar esa receta.',
            { endSession: true }
          )
        );
      }

      // Si anteriormente preguntó por los pasos
      if (
        sessionAttributes.pendingAction === 'steps'
      ) {

        return res.json(
          buildStepsResponse(
            details,
            sessionAttributes
          )
        );
      }

      // Si anteriormente preguntó por otra receta
      if (
        sessionAttributes.pendingAction === 'newRecipe'
      ) {

        return res.json(
          buildResponse(
            'Claro. Dime el nombre de la receta que quieres consultar.',
            {
              reprompt: '¿Qué receta quieres preparar?',
              sessionAttributes: {
                ...sessionAttributes,
                pendingAction: null,
              },
            }
          )
        );
      }

      return res.json(
        buildResponse(
          '¿Qué receta quieres consultar?',
          {
            reprompt: 'Dime el nombre de una receta.',
          }
        )
      );
    }


    // ========================================
    // RESPUESTA NEGATIVA
    // ========================================

    if (intentName === 'AMAZON.NoIntent') {

      return res.json(
        buildResponse(
          'De acuerdo. Puedes pedirme otra receta cuando quieras.',
          {
            reprompt: '¿Qué otra receta quieres consultar?',
            sessionAttributes: {
              ...sessionAttributes,
              pendingAction: null,
            },
          }
        )
      );
    }


    // ========================================
    // AYUDA
    // ========================================

    if (intentName === 'AMAZON.HelpIntent') {

      return res.json(
        buildResponse(
          'Puedes decir: dame una receta, dame la receta de cheesecake, cuáles son los ingredientes o cómo se prepara un platillo.',
          {
            reprompt: '¿Qué receta quieres preparar?',
            sessionAttributes,
          }
        )
      );
    }


    // ========================================
    // RECETA ALEATORIA
    // ========================================

    if (intentName === 'RandomRecipeIntent') {

      const recipe = await getRandomRecipe();

      if (!recipe) {

        return res.json(
          buildResponse(
            'Todavía no hay recetas disponibles en CookHub.'
          )
        );
      }

      const details =
        await getRecipeDetails(recipe.id);

      if (!details) {

        return res.json(
          buildResponse(
            `No pude obtener la información de ${recipe.titulo}.`
          )
        );
      }

      return res.json(
        buildIngredientsResponse(
          details,
          sessionAttributes
        )
      );
    }


    // ========================================
    // BUSCAR RECETA, INGREDIENTES O PASOS
    // ========================================

    if (
      intentName === 'RecipeLookupIntent' ||
      intentName === 'RecipeIngredientsIntent' ||
      intentName === 'RecipeStepsIntent'
    ) {

      const recipeName =
        getSlotValue(intent, 'recipeName');

      let recipe = null;

      // Buscar por nombre
      if (recipeName) {

        recipe = await findRecipeByName(recipeName);

      } else if (
        sessionAttributes.lastRecipeId &&
        (
          intentName === 'RecipeIngredientsIntent' ||
          intentName === 'RecipeStepsIntent'
        )
      ) {

        const result = await pool.query(
          `SELECT id, titulo
           FROM recetas
           WHERE id = ?`,
          [sessionAttributes.lastRecipeId]
        );

        recipe = getRows(result)[0] || null;
      }

      if (!recipeName && !recipe) {

        return res.json(
          buildResponse(
            '¿De qué receta quieres saber?',
            {
              reprompt: 'Dime el nombre de una receta.',
              sessionAttributes,
            }
          )
        );
      }

      if (!recipe) {

        return res.json(
          buildResponse(
            `No encontré una receta llamada ${recipeName}.`,
            {
              reprompt:
                'Puedes decirme el nombre de otra receta.',
              sessionAttributes,
            }
          )
        );
      }

      const details =
        await getRecipeDetails(recipe.id);

      if (!details) {

        return res.json(
          buildResponse(
            `No pude obtener la información de ${recipe.titulo}.`
          )
        );
      }

      // Consultar receta o ingredientes
      if (
        intentName === 'RecipeLookupIntent' ||
        intentName === 'RecipeIngredientsIntent'
      ) {

        return res.json(
          buildIngredientsResponse(
            details,
            sessionAttributes
          )
        );
      }

      // Consultar directamente los pasos
      return res.json(
        buildStepsResponse(
          details,
          sessionAttributes
        )
      );
    }


    // ========================================
    // SOLICITUD NO RECONOCIDA
    // ========================================

    if (intentName === 'AMAZON.FallbackIntent') {

      return res.json(
        buildResponse(
          'No entendí esa solicitud. Puedes pedirme una receta, sus ingredientes o sus pasos.',
          {
            reprompt: '¿Qué receta quieres preparar?',
            sessionAttributes,
          }
        )
      );
    }

    return res.json(
      buildResponse(
        'Todavía no puedo realizar esa petición. Puedes pedirme una receta o consultar sus ingredientes y pasos.',
        {
          reprompt: '¿Qué necesitas?',
          sessionAttributes,
        }
      )
    );

  } catch (error) {

    console.error(
      'Error en endpoint Alexa:',
      error
    );

    return res.status(500).json(
      buildResponse(
        'Ocurrió un error al consultar CookHub.',
        {
          endSession: true,
        }
      )
    );
  }
});

export default router;