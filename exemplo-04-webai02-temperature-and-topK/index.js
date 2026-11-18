
const aiContext = {
    session: null,
    abortController: null,
    isGenerating: false,
};

// The Prompt API only accepts a few languages (en, es, ja, de, fr), so we use English.
// The same options must be used in availability() and in create().
const LANGUAGE = 'en';
const languageOptions = {
    expectedInputs: [{ type: 'text', languages: [LANGUAGE] }],
    expectedOutputs: [{ type: 'text', languages: [LANGUAGE] }],
};

// LanguageModel.params() is not exposed to web pages anymore (only to Chrome extensions).
// These are the values documented by Chrome, used when params() is not available.
const FALLBACK_PARAMS = {
    defaultTemperature: 1,
    defaultTopK: 3,
    maxTemperature: 2,
    maxTopK: 128,
};

const elements = {
    temperature: document.getElementById('temperature'),
    temperatureValue: document.getElementById('temp-value'),
    topKValue: document.getElementById('topk-value'),
    topK: document.getElementById('topK'),
    form: document.getElementById('question-form'),
    questionInput: document.getElementById('question'),
    output: document.getElementById('output'),
    button: document.getElementById('ask-button'),
    year: document.getElementById('year'),
}

async function setupEventListeners() {

    // Update display values for range inputs
    elements.temperature.addEventListener('input', (e) => {
        elements.temperatureValue.textContent = e.target.value;
    });

    elements.topK.addEventListener('input', (e) => {
        elements.topKValue.textContent = e.target.value;
    });

    elements.form.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (aiContext.isGenerating) {
            toggleSendOrStopButton(false)
            return;
        }

        onSubmitQuestion();
    });
}

async function onSubmitQuestion() {
    const questionInput = elements.questionInput;
    const output = elements.output;
    const question = questionInput.value;

    if (!question.trim()) {
        return;
    }

    // Get parameters from form
    const temperature = parseFloat(elements.temperature.value);
    const topK = parseInt(elements.topK.value);
    // console.log('Using parameters:', { temperature, topK });

    // Change button to stop mode
    toggleSendOrStopButton(true)

    try {
        output.textContent = 'Processing your question...';
        // The model is downloaded here, if needed. This runs inside the click
        // on "Send", which is the user gesture Chrome requires to start the download.
        const aiResponseChunks = askAI(question, temperature, topK);
        let isFirstChunk = true;

        for await (const chunk of aiResponseChunks) {
            if (aiContext.abortController.signal.aborted) {
                break;
            }
            if (isFirstChunk) {
                output.textContent = '';
                isFirstChunk = false;
            }
            // console.log('Received chunk:', chunk);
            output.textContent += chunk;
        }
    } catch (error) {
        console.error('Error while asking the AI:', error);
        output.textContent = `⚠️ Error (${error.name}): ${error.message}`;
    } finally {
        toggleSendOrStopButton(false);
    }
}

function toggleSendOrStopButton(isGenerating) {
    if (isGenerating) {
        // Switch to stop mode
        aiContext.isGenerating = isGenerating;
        elements.button.textContent = 'Stop';
        elements.button.classList.add('stop-button');
    } else {
        // Switch to send mode
        aiContext.abortController?.abort();
        aiContext.isGenerating = isGenerating;
        elements.button.textContent = 'Send';
        elements.button.classList.remove('stop-button');
    }
}
async function* askAI(question, temperature, topK) {
    aiContext.abortController?.abort();
    aiContext.abortController = new AbortController();

    // Destroy previous session and create new one with updated parameters
    if (aiContext.session) {
        aiContext.session.destroy();
        aiContext.session = null;
    }

    // create() downloads the model on the first use (it may take a few minutes)
    const session = await LanguageModel.create({
        ...languageOptions,
        temperature: temperature,
        topK: topK,
        initialPrompts: [
            {
                role: 'system', content: `
                You are an AI assistant that answers clearly and objectively.
                Always answer in plain text instead of markdown`

            },
        ],
        monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
                const percent = ((e.loaded / (e.total || 1)) * 100).toFixed(0);
                // console.log(`Downloaded ${percent}%`);
                elements.output.textContent = `Downloading the AI model... ${percent}%`;
            });
        },
    });
    aiContext.session = session;

    const responseStream = await session.promptStreaming(
        [
            {
                role: 'user',
                content: question,
            },
        ],
        {
            signal: aiContext.abortController.signal,
        }
    );

    for await (const chunk of responseStream) {
        if (aiContext.abortController.signal.aborted) {
            break;
        }
        yield chunk;
    }
}

// Only checks if the browser supports the API. It does NOT download anything:
// the download happens when the user clicks "Send".
async function checkRequirements() {
    const errors = [];
    const returnResults = () => errors.length ? errors : null;

    // @ts-ignore
    const isChrome = !!window.chrome;
    if (!isChrome)
        errors.push("⚠️ This feature only works in Google Chrome or Chrome Canary (recent version).");
    if (!('LanguageModel' in self)) {
        errors.push("⚠️ The native AI APIs are not enabled.");
        errors.push("Enable the following flag in chrome://flags/:");
        errors.push("- Prompt API for Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano)");
        errors.push("Then restart Chrome and try again.");
        return returnResults();
    }

    const availability = await LanguageModel.availability(languageOptions);
    // console.log('Language Model Availability:', availability);

    if (availability === 'unavailable') {
        errors.push(`⚠️ Your device does not support native AI language models (or the language "${LANGUAGE}" is not supported).`);
    }

    return returnResults();
}

async function getModelParams() {
    try {
        if (typeof LanguageModel.params === 'function') {
            const params = await LanguageModel.params();
            if (params) {
                return params;
            }
        }
    } catch (error) {
        console.warn('LanguageModel.params() failed:', error);
    }

    console.warn('LanguageModel.params() is not available here. Using the documented default values.');
    return FALLBACK_PARAMS;
}

async function showModelStatus() {
    const availability = await LanguageModel.availability(languageOptions);

    if (availability === 'downloadable' || availability === 'downloading') {
        elements.output.textContent =
            'ℹ️ The AI model has not been downloaded yet. ' +
            'Type a question and click "Send": the model will be downloaded first (it can take a few minutes).';
    }
}

(async function main() {
    elements.year.textContent = new Date().getFullYear();

    const reqErrors = await checkRequirements();
    if (reqErrors) {
        elements.output.innerHTML = reqErrors.join('<br/>');
        elements.button.disabled = true;
        return;
    }

    const params = await getModelParams();
    console.log('Language Model Params:', params);
    /*
    defaultTemperature: 1
    defaultTopK:3
    maxTemperature:2
    maxTopK:128
    */

    elements.topK.max = params.maxTopK;
    elements.topK.min = 1;
    elements.topK.value = params.defaultTopK;
    elements.topKValue.textContent = params.defaultTopK;

    elements.temperatureValue.textContent = params.defaultTemperature;
    elements.temperature.max = params.maxTemperature;
    elements.temperature.min = 0;
    elements.temperature.value = params.defaultTemperature;

    await showModelStatus();
    return setupEventListeners()
})();

