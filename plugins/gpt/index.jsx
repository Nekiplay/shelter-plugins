const {
  observeDom,
  ui: {
    injectCss,
    Button,
    openModal,
    ModalRoot,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalSizes,
    Text,
    TextBox,
    ReactiveRoot,
    TextArea,
    ButtonLooks,
  },
  plugin: { store },
  util: { getFiber },
} = shelter;

let popupButton = null;
let unobserve = null;

const getMessageHistory = () => {
  const messageElements = document.querySelectorAll('div[class^="message-"]');

  const messages = [...messageElements].map((message) => ({
    username: message.querySelector("h3 > span > span")?.textContent,
    message: message.querySelector("div > div > div").textContent,
  }));

  return messages.reduce((acc, message) => {
    if (message.username) {
      acc.push(message);
    } else {
      acc[acc.length - 1].message += `\n${message.message}`;
    }
    return acc;
  }, []);
};

const loadingIndicator = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    id="loading-indicator"
    fill="white"
  >
    <path
      d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
      opacity=".25"
    />
    <path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z">
      <animateTransform
        attributeName="transform"
        type="rotate"
        dur="0.75s"
        values="0 12 12;360 12 12"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

// Credits to yellowsink for this messagebar stuff
// https://github.com/yellowsink
const appendTextToMessagebar = (text) => {
  const elem = document.querySelector('[class*="slateContainer-"]');
  const fiber = getFiber(elem);
  const editor = fiber.child.pendingProps.editor;

  editor.insertText(text);
};

export function onLoad() {
  injectCss(`
  .label-spacing {
    margin-bottom: .125rem;
  }
  .mb-2 {
    margin-bottom: .5rem;
  }

  .pr-2 {
    padding-right: .5rem;
  }`);

  let closeModal = null;
  const openGenerationModal = async () => {
    let savedModel = store.model || "gpt-3.5-turbo";

    let model = savedModel;
    let prompt = "";
    closeModal = openModal((p) => (
      <ModalRoot size={ModalSizes.SMALL}>
        <ModalHeader close={() => closeModal()}>Generate Response</ModalHeader>
        <ModalBody>
          <div className="pr-2">
            <div className="mb-2 flex">
              <div className="label-spacing">
                <Text>Model</Text>
              </div>
              <TextBox
                placeholder="gpt-3.5-turbo"
                value={savedModel}
                onInput={(e) => {
                  model = e;
                }}
              />
            </div>
            <div className="label-spacing">
              <Text>Prompt</Text>
            </div>
            <TextArea
              width="100%"
              value=""
              placeholder="Prompt"
              onInput={(e) => {
                prompt = e;
              }}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <div
            style={{
              display: "flex",
            }}
          >
            <Button
              grow={true}
              onClick={async () => {
                closeModal();

                const myUsername = document.querySelector(
                  "[class^=nameTag] > div"
                ).textContent;

                store.model = model;

                const messages = [
                  ...getMessageHistory()
                    .slice(-7)
                    .map((message) => ({
                      role: "user",
                      content: `${message.username}: ${message.message}`,
                    })),
                  {
                    role: "system",
                    content: `generate a response as "${myUsername}" according to the prompt: "${prompt}"`,
                  },
                ];

                // add loading indicator
                const messageBar = document.querySelector(
                  '[class*="slateContainer-"]'
                );
                // get absolute position of messagebar
                const { x, y } = messageBar.getBoundingClientRect();
                const loadingIndicatorElem = document.body.appendChild(
                  loadingIndicator()
                );

                loadingIndicatorElem.style.position = "absolute";
                loadingIndicatorElem.style.left = `${x}px`;
                loadingIndicatorElem.style.top = `${y + 12}px`;

                fetch("https://api.naga.ac/v1/chat/completions/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${store.openaiKey}`,
                  },
                  body: JSON.stringify({
                    model,
                    messages,
                  }),
                })
                  .then((res) => res.json())
                  .then((res) => {
                    const response = res.choices[0].message.content;
                    appendTextToMessagebar(
                      response
                        .replace(/^(?=.{0,49}:)([\w\s\-]+?[^ ]):/, "")
                        .trim()
                    );

                    loadingIndicatorElem.remove();
                  });
              }}
            >
              Generate
            </Button>
          </div>
        </ModalFooter>
      </ModalRoot>
    ));
  };
