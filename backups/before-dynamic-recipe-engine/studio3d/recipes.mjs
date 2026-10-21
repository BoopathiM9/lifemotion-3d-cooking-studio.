/* =========================================================
   LifeMotion 3D Cooking Studio
   Dynamic Recipe Storyboard Generator
   ========================================================= */


/* =========================================================
   VOICES
   ========================================================= */

export const voices = [
    "en-US-JennyNeural",
    "en-US-AriaNeural"
];


/* =========================================================
   SERVER COMPATIBILITY

   server.mjs currently imports:
   { recipes, voices, storyboard }

   We keep this export so the server does not crash.
   Recipes are now generated dynamically by storyboard().
   ========================================================= */

export const recipes = {};


/* =========================================================
   TEXT HELPERS
   ========================================================= */

function titleCase(value = "") {

    return value
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(
            /\b\w/g,
            letter => letter.toUpperCase()
        );
}


function slugify(value = "") {

    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}


function splitSentences(text) {

    return (
        text.match(
            /[^.!?]+[.!?]+|[^.!?]+$/g
        ) || [text]
    )
        .map(value => value.trim())
        .filter(Boolean);
}


function createAction(key, text) {

    return {
        key,
        text,
        sentences: splitSentences(text)
    };
}


/* =========================================================
   RECIPE NAME DETECTION
   ========================================================= */

function extractRecipeName(prompt) {

    let text = prompt
        .trim()
        .replace(/\s+/g, " ");


    /*
     * Remove common instructions from beginning.
     */

    const beginningPatterns = [

        /^please\s+/i,

        /^can you\s+/i,

        /^could you\s+/i,

        /^i want to\s+/i,

        /^i would like to\s+/i,

        /^show me\s+/i,

        /^teach me\s+/i,

        /^teach children\s+/i,

        /^teach kids\s+/i,

        /^create\s+/i,

        /^generate\s+/i,

        /^how to\s+/i

    ];


    let changed = true;


    while (changed) {

        changed = false;


        for (const pattern of beginningPatterns) {

            const next = text.replace(
                pattern,
                ""
            );


            if (next !== text) {

                text = next.trim();

                changed = true;
            }
        }
    }


    /*
     * Remove:
     *
     * make
     * prepare
     * cook
     */

    text = text.replace(
        /^(make|prepare|cook)\s+/i,
        ""
    );


    /*
     * Remove video wording.
     */

    text = text.replace(
        /^(?:a\s+|an\s+)?(?:3d\s+)?(?:cartoon\s+)?(?:cooking\s+)?video\s+(?:of|for|showing|about)\s+/i,
        ""
    );


    /*
     * Remove unnecessary trailing instructions.
     */

    const endingPatterns = [

        /\s+step\s+by\s+step\b/i,

        /\s+in\s+simple\s+english\b/i,

        /\s+for\s+children\b/i,

        /\s+for\s+kids\b/i,

        /\s+with\s+maya\b/i,

        /\s+where\s+maya\b/i,

        /\s+and\s+explain\b/i,

        /\s+and\s+show\b/i

    ];


    for (const pattern of endingPatterns) {

        const match = text.match(pattern);


        if (match) {

            text = text.slice(
                0,
                match.index
            );
        }
    }


    text = text
        .replace(/[.!?,;:]+$/g, "")
        .trim();


    if (!text) {

        return "Cooking Recipe";
    }


    /*
     * Prevent extremely long recipe names.
     */

    const words = text.split(/\s+/);


    if (words.length > 8) {

        text = words
            .slice(0, 8)
            .join(" ");
    }


    return titleCase(text);
}


/* =========================================================
   RECIPE TYPE DETECTION
   ========================================================= */

function classifyRecipe(title, prompt) {

    const text =
        `${title} ${prompt}`.toLowerCase();


    /*
     * Dosa / Pancake
     */

    if (
        /\b(dosa|pancake|crepe|uttapam)\b/.test(text)
    ) {

        return "pan-batter";
    }


    /*
     * Sandwich / Burger / Wrap
     */

    if (
        /\b(sandwich|burger|toast|wrap)\b/.test(text)
    ) {

        return "assembly";
    }


    /*
     * Rice dishes
     */

    if (
        /\b(rice|biryani|biriyani|pulao|pulav|pilaf|risotto)\b/.test(text)
    ) {

        return "rice";
    }


    /*
     * Pasta / Noodles
     */

    if (
        /\b(pasta|spaghetti|macaroni|noodle|noodles)\b/.test(text)
    ) {

        return "pasta";
    }


    /*
     * Curry / Soup
     */

    if (
        /\b(soup|curry|gravy|dal|dhal|sambar|rasam|stew|kurma|korma)\b/.test(text)
    ) {

        return "pot";
    }


    /*
     * Fried dishes
     */

    if (
        /\b(fry|fried|stir[- ]?fry|manchurian)\b/.test(text)
    ) {

        return "fry";
    }


    /*
     * Baked dishes
     */

    if (
        /\b(pizza|cake|cookie|cookies|muffin|bake|baked)\b/.test(text)
    ) {

        return "bake";
    }


    /*
     * Indian flatbread
     */

    if (
        /\b(chapati|roti|paratha|naan|phulka)\b/.test(text)
    ) {

        return "flatbread";
    }


    /*
     * Salad
     */

    if (
        /\b(salad)\b/.test(text)
    ) {

        return "cold";
    }


    /*
     * Unknown recipe.
     *
     * We still create a generic cooking storyboard.
     */

    return "generic";
}


/* =========================================================
   COMMON STORYBOARD ACTIONS
   ========================================================= */

function welcomeAction(title) {

    return createAction(
        "welcome",

        `Hello, little chefs! I'm MAYA. ` +
        `Today we're going to make ${title}. ` +
        `Let's get started!`
    );
}


function safetyAction() {

    return createAction(
        "safe",

        "First, wash your hands and keep the cooking area clean. " +
        "Ask a grown-up to help with hot surfaces, sharp tools, " +
        "and kitchen appliances."
    );
}


function ingredientsAction(title) {

    return createAction(
        "ingredients",

        `Let's prepare the ingredients needed for ${title}. ` +
        `Measure everything carefully and keep the ingredients ready before cooking.`
    );
}


function serveAction(title) {

    return createAction(
        "serve",

        `Our ${title} is ready! ` +
        `Carefully place it on the serving plate. ` +
        `Let hot food cool before tasting. ` +
        `Great cooking!`
    );
}


/* =========================================================
   DOSA / PANCAKE / CREPE
   ========================================================= */

function panBatterActions(title) {

    return [

        createAction(
            "pour",

            `Take the prepared batter for ${title}. ` +
            `Pour it gently into the middle of the warm pan.`
        ),


        createAction(
            "spread",

            "Spread the batter gently in circles, " +
            "starting from the middle and moving outwards."
        ),


        createAction(
            "cook",

            `Let the ${title} cook carefully until the edges begin to turn golden.`
        ),


        createAction(
            "flip",

            `Carefully slide the spatula underneath the ${title} ` +
            `and flip it if the recipe requires cooking on both sides.`
        )

    ];
}


/* =========================================================
   RICE / BIRYANI / PULAO
   ========================================================= */

function riceActions(title) {

    return [

        createAction(
            "pick",

            `Let's prepare the main ingredients for ${title}.`
        ),


        createAction(
            "cook",

            "Carefully cook the prepared ingredients in the pan or pot."
        ),


        createAction(
            "pour",

            "Now carefully add the prepared rice."
        ),


        createAction(
            "layer",

            "Add the remaining prepared ingredients over the rice."
        ),


        createAction(
            "spread",

            "Spread everything evenly so the ingredients are distributed across the pot."
        ),


        createAction(
            "cook",

            `Let the ${title} cook until the rice is ready and the flavours come together.`
        )

    ];
}


/* =========================================================
   PASTA / NOODLES
   ========================================================= */

function pastaActions(title) {

    return [

        createAction(
            "cook",

            "Ask a grown-up to help cook the pasta or noodles until they are ready."
        ),


        createAction(
            "pick",

            "Prepare the ingredients needed for the sauce."
        ),


        createAction(
            "pour",

            "Carefully add the prepared sauce ingredients to the pan."
        ),


        createAction(
            "cook",

            "Cook the sauce gently until the ingredients come together."
        ),


        createAction(
            "layer",

            `Now add the cooked pasta or noodles for our ${title}.`
        ),


        createAction(
            "spread",

            "Gently combine everything so the sauce coats the food evenly."
        )

    ];
}


/* =========================================================
   CURRY / SOUP / DAL
   ========================================================= */

function potActions(title) {

    return [

        createAction(
            "pick",

            `Prepare the ingredients for ${title}.`
        ),


        createAction(
            "pour",

            "Carefully add the prepared ingredients to the cooking pot."
        ),


        createAction(
            "cook",

            "Let the ingredients cook gently."
        ),


        createAction(
            "pour",

            "Add the required liquid carefully."
        ),


        createAction(
            "spread",

            "Gently combine the ingredients together."
        ),


        createAction(
            "cook",

            `Let the ${title} cook until everything is ready and the flavours come together.`
        )

    ];
}


/* =========================================================
   FRIED FOOD
   ========================================================= */

function fryActions(title) {

    return [

        createAction(
            "pick",

            `Prepare all the ingredients for ${title}.`
        ),


        createAction(
            "pour",

            "Add a small amount of cooking oil to the pan with help from a grown-up."
        ),


        createAction(
            "layer",

            "Carefully add the prepared ingredients."
        ),


        createAction(
            "cook",

            "Cook the ingredients carefully over the heat."
        ),


        createAction(
            "spread",

            "Move and combine the ingredients gently so they cook evenly."
        ),


        createAction(
            "cook",

            `Continue cooking until the ${title} is ready.`
        )

    ];
}


/* =========================================================
   SANDWICH / BURGER / WRAP
   ========================================================= */

function assemblyActions(title) {

    return [

        createAction(
            "pick",

            `Place the base for our ${title} on a clean board.`
        ),


        createAction(
            "spread",

            "Spread the prepared sauce or filling gently over the base."
        ),


        createAction(
            "layer",

            "Add the prepared ingredients neatly."
        ),


        createAction(
            "close",

            `Carefully finish assembling the ${title}.`
        )

    ];
}


/* =========================================================
   BAKED FOOD
   ========================================================= */

function bakedActions(title) {

    return [

        createAction(
            "pick",

            `Prepare the ingredients for ${title}.`
        ),


        createAction(
            "pour",

            "Add the prepared mixture to the cooking container."
        ),


        createAction(
            "spread",

            "Spread the mixture evenly."
        ),


        createAction(
            "cook",

            `Ask a grown-up to help cook or bake the ${title} safely.`
        ),


        createAction(
            "pick",

            `Carefully remove the ${title} when it is ready and allow it to cool.`
        )

    ];
}


/* =========================================================
   CHAPATI / ROTI / PARATHA
   ========================================================= */

function flatbreadActions(title) {

    return [

        createAction(
            "pick",

            `Take the prepared dough for ${title}.`
        ),


        createAction(
            "spread",

            "Flatten the dough gently into a round shape."
        ),


        createAction(
            "cook",

            `Place the ${title} on the warm pan with help from a grown-up.`
        ),


        createAction(
            "flip",

            `Carefully flip the ${title} so the other side can cook.`
        ),


        createAction(
            "cook",

            `Cook until the ${title} is ready.`
        )

    ];
}


/* =========================================================
   SALAD / COLD FOOD
   ========================================================= */

function coldActions(title) {

    return [

        createAction(
            "pick",

            `Prepare the clean ingredients for ${title}.`
        ),


        createAction(
            "layer",

            "Place the prepared ingredients together."
        ),


        createAction(
            "pour",

            "Add the prepared dressing if the recipe needs it."
        ),


        createAction(
            "spread",

            "Gently combine everything together."
        )

    ];
}


/* =========================================================
   UNKNOWN / GENERIC RECIPE
   ========================================================= */

function genericActions(title) {

    return [

        createAction(
            "pick",

            `Let's prepare everything we need for ${title}.`
        ),


        createAction(
            "pour",

            "Carefully add the prepared ingredients to the cooking area."
        ),


        createAction(
            "cook",

            "Cook the ingredients carefully with help from a grown-up."
        ),


        createAction(
            "spread",

            "Gently combine the ingredients so everything cooks evenly."
        ),


        createAction(
            "cook",

            `Continue cooking until the ${title} is ready.`
        )

    ];
}


/* =========================================================
   CHOOSE ACTION SET
   ========================================================= */

function generateCookingActions(type, title) {

    switch (type) {

        case "pan-batter":

            return panBatterActions(title);


        case "rice":

            return riceActions(title);


        case "pasta":

            return pastaActions(title);


        case "pot":

            return potActions(title);


        case "fry":

            return fryActions(title);


        case "assembly":

            return assemblyActions(title);


        case "bake":

            return bakedActions(title);


        case "flatbread":

            return flatbreadActions(title);


        case "cold":

            return coldActions(title);


        default:

            return genericActions(title);

    }
}


/* =========================================================
   MAIN STORYBOARD FUNCTION
   ========================================================= */

export function storyboard({

    prompt,

    recipe = "auto",

    voice = voices[0],

    format = "16:9"

} = {}) {


    /* -----------------------------------------------------
       PROMPT VALIDATION
       ----------------------------------------------------- */

    if (
        typeof prompt !== "string" ||
        !prompt.trim() ||
        prompt.length > 2000
    ) {

        throw Error(
            "Enter a recipe or cooking instruction between 1 and 2000 characters."
        );
    }


    /* -----------------------------------------------------
       VOICE VALIDATION
       ----------------------------------------------------- */

    if (
        !voices.includes(voice)
    ) {

        throw Error(
            "Choose an available English voice."
        );
    }


    /* -----------------------------------------------------
       FORMAT VALIDATION
       ----------------------------------------------------- */

    if (
        ![
            "16:9",
            "9:16"
        ].includes(format)
    ) {

        throw Error(
            "Choose 16:9 or 9:16."
        );
    }


    /* -----------------------------------------------------
       RECIPE TITLE
       ----------------------------------------------------- */

    const title =
        extractRecipeName(prompt);


    /* -----------------------------------------------------
       RECIPE ID
       ----------------------------------------------------- */

    let recipeId =
        slugify(title);


    if (!recipeId) {

        recipeId =
            "custom-recipe";
    }


    /*
     * If an old frontend sends a recipe ID,
     * don't reject it.
     *
     * Dynamic recipe generation is based primarily
     * on the prompt.
     */

    if (
        recipe &&
        recipe !== "auto" &&
        typeof recipe === "string"
    ) {

        recipeId =
            slugify(recipe) ||
            recipeId;
    }


    /* -----------------------------------------------------
       DETECT COOKING TYPE
       ----------------------------------------------------- */

    const cookingType =
        classifyRecipe(
            title,
            prompt
        );


    /* -----------------------------------------------------
       BUILD ACTIONS
       ----------------------------------------------------- */

    const actions = [

        welcomeAction(title),

        safetyAction(),

        ingredientsAction(title),

        ...generateCookingActions(
            cookingType,
            title
        ),

        serveAction(title)

    ];


    /* -----------------------------------------------------
       RETURN STORYBOARD
       ----------------------------------------------------- */

    return {

        recipe:
            recipeId,

        title,

        voice,

        format,

        prompt:
            prompt.trim(),

        cookingType,

        actions,

        limitations:
            "Recipe prompts are converted into reusable cooking actions supported by the current 3D scene system."

    };
}


/* =========================================================
   OPTIONAL DEVELOPMENT HELPERS
   ========================================================= */

export const recipeTools = {

    extractRecipeName,

    classifyRecipe,

    slugify,

    titleCase

};