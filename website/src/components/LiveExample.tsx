import { useState, useRef, useEffect, Fragment } from "react";
import { createEditor, PrismEditor } from "prism-code-editor";
import * as seria from "seria";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useTheme } from "../hooks/useTheme";
import { loadTheme } from "prism-code-editor/themes";
import "prism-code-editor/prism/languages/javascript";
import "prism-code-editor/layout.css";

const EDITOR_STYLES = {
  dark: "",
  light: "",
};

Promise.all([loadTheme("github-dark"), loadTheme("github-light")]).then(
  ([darkTheme, lightTheme]) => {
    EDITOR_STYLES.dark = darkTheme;
    EDITOR_STYLES.light = lightTheme;
  }
);

const INITIAL_CODE = `{
    name: "Satoru Gojo",
    age: 28,
    alive: true,
    birthdate: new Date(1989, 11, 7),
    zodiac_sign: Symbol.for("Sagittarius"),
    ability: delay(1000).then(() => "Limitless")
}`;

type StringifyMode = "json.stringify" | "seria.stringify";

type StringifyOutput =
  | {
      state: "success";
      json: string;
    }
  | {
      state: "error";
      message: string;
    }
  | {
      state: "loading";
    };

export default function LiveExample() {
  const [code, setCode] = useState(INITIAL_CODE);
  const editorContainerRef = useRef<HTMLDivElement>();
  const editorRef = useRef<PrismEditor>();
  const [mode, setMode] = useState<StringifyMode>("seria.stringify");
  const [stringifyOutput, setStringifyOutput] = useState<StringifyOutput>();
  const theme = useTheme();

  useEffect(() => {
    if (!editorContainerRef.current) {
      return;
    }

    editorRef.current = createEditor(
      editorContainerRef.current,
      {
        language: "javascript",
        value: code,
        lineNumbers: false,
        onUpdate(value) {
          setCode(value);
        },
      },
      () => console.log("editor ready")
    );

    return () => {
      if (editorRef.current) {
        editorRef.current.remove();
      }
    };
  }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        const obj = safeEval(code);

        switch (mode) {
          case "json.stringify": {
            const json = JSON.stringify(obj, null, 2);
            setStringifyOutput({ state: "success", json });
            break;
          }
          case "seria.stringify": {
            setStringifyOutput({ state: "loading" });
            const json = await seria.stringifyAsync(obj, null, 2);
            setStringifyOutput({ state: "success", json });
            break;
          }
        }
      } catch (err: any) {
        console.error(err);
        const message = err?.message ?? "Failed to stringify";
        setStringifyOutput({ state: "error", message });
      }
    })();
  }, [code, mode]);

  return (
    <div>
      <style
        id="editor-theme"
        dangerouslySetInnerHTML={{
          __html: theme === "dark" ? EDITOR_STYLES.dark : EDITOR_STYLES.light,
        }}
      ></style>
      <h1 className="text-center mb-0">Try out seria serialization!</h1>
      <div className="p-2 flex flex-col 2xl:flex-row w-full h-full gap-2">
        <div className="w-full h-full">
          <h2>Javascript</h2>
          <div className="w-full h-full border border-gray-400 shadow rounded-lg overflow-hidden">
            <div ref={editorContainerRef} className="w-[600px] h-[300px]" />
          </div>
        </div>

        <div className="w-full h-full ">
          <h2>Result</h2>
          <div className="relative w-full h-full">
            <div className="absolute right-0 top-0">
              <StringifyModeSelect value={mode} onChange={setMode} />
            </div>

            <div className="w-[600px] h-[300px]">
              {stringifyOutput && <StringifyPreview result={stringifyOutput} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StringifyPreview({ result }: { result: StringifyOutput }) {
  switch (result.state) {
    case "loading":
      return (
        <div className="px-4 py-10 bg-neutral-800 text-green-500 font-mono h-full w-full flex rounded-lg">
          Resolving...
        </div>
      );
    case "error":
      return (
        <div className="px-4 py-10 bg-neutral-800 text-red-500 font-mono h-full w-full rounded-lg">
          {result.message}
        </div>
      );
    case "success":
      return (
        <div className="p-4 bg-neutral-800 text-pink-400 rounded-lg w-full h-full">
          <pre className="bg-transparent">
            <code className="text-wrap">{result.json}</code>
          </pre>
        </div>
      );
    // return (
    //   <SyntaxHighlighter
    //     language={"json"}
    //     style={a11yDark}
    //     wrapLongLines
    //     wrapLines
    //     customStyle={{
    //       height: "100%",
    //       width: "100%",
    //       paddingTop: 40,
    //     }}
    //   >
    //     {data.json}
    //   </SyntaxHighlighter>
    // );
  }
}

const STRINGIFY_MODES = [
  { name: "seria.stringify", value: "seria.stringify" },
  { name: "JSON.stringify", value: "json.stringify" },
] as const satisfies {
  name: string;
  value: StringifyMode;
}[];

function DisplayMode({ name }: { name: string }) {
  const parts = name.split(".");

  return (
    <>
      <span className="font-bold text-pink-600">{parts[0]}</span>
      {"."}
      <span className="">{parts[1]}</span>
    </>
  );
}

function StringifyModeSelect({
  value,
  onChange,
}: {
  value: StringifyMode;
  onChange: (value: StringifyMode) => void;
}) {
  const getModeName = (value: StringifyMode) =>
    STRINGIFY_MODES.find((x) => x.value === value)?.name as string;

  return (
    <Listbox
      value={value}
      onChange={(e) => {
        console.log(e);
        onChange(e);
      }}
    >
      <div className="relative mt-1 w-[240px]">
        <Listbox.Button className="relative border-none w-full cursor-default rounded-lg bg-white dark:bg-neutral-900 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
          <span className="block truncate text-black dark:text-white font-mono">
            <DisplayMode name={getModeName(value)} />
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md dark:bg-neutral-900 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm pl-0"
            style={{
              listStyle: "none",
            }}
          >
            {STRINGIFY_MODES.map((mode) => (
              <Listbox.Option
                key={mode.value}
                value={mode.value}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active
                      ? "bg-indigo-200 dark:bg-neutral-700 text-indigo-900"
                      : "text-gray-900"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate font-mono dark:text-white ${
                        selected ? "font-medium" : "font-normal"
                      }`}
                    >
                      <DisplayMode name={mode.name} />
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-500">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

function safeEval(code: string) {
  if (typeof window === "undefined") {
    throw new Error("Safe eval can only run on the browser");
  }

  const globalsVar = `w_${Math.ceil(Math.random() * 1000_000)}`;
  const scope = `
        // Save window objects for later restoration
        const ${globalsVar} = {};
        ['alert', 'confirm', 'prompt', 'close', 'open', 'console', 'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName'].forEach(prop => {
            ${globalsVar}[prop] = window[prop];
            delete window[prop];
        });

        // Custom functions
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        (function() {
            // Try-finally block for restoring window objects
            try {
                return (${code})
            } finally {
                // Restore window objects
                Object.keys(${globalsVar}).forEach(prop => {
                    window[prop] = ${globalsVar}[prop];
                });
            }
        })()
    `;

  return eval(scope);
}
