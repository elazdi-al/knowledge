"use client";

import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
  useSandpackNavigation,
} from "@codesandbox/sandpack-react";
import { useEffect, useState } from "react";

type FileMap = Record<
  string,
  string | { code: string; active?: boolean; hidden?: boolean }
>;

interface CodePlaygroundProps {
  files: FileMap;
  title?: string;
  template?: "react" | "vanilla" | "vue" | "svelte" | "static";
  showPreview?: boolean;
}

const theme = {
  colors: {
    surface1: "var(--cp-surface1)",
    surface2: "var(--cp-surface2)",
    surface3: "var(--cp-surface3)",
    clickable: "var(--cp-clickable)",
    base: "var(--cp-base)",
    disabled: "var(--cp-disabled)",
    hover: "var(--cp-hover)",
    accent: "var(--cp-accent)",
    error: "#000000",
    errorSurface: "var(--cp-error-surface)",
  },
  syntax: {
    plain: "var(--cp-syntax-plain)",
    comment: { color: "var(--cp-syntax-comment)", fontStyle: "italic" as const },
    keyword: "var(--cp-syntax-keyword)",
    tag: "var(--cp-syntax-tag)",
    punctuation: "var(--cp-syntax-punctuation)",
    definition: "var(--cp-syntax-definition)",
    property: "var(--cp-syntax-property)",
    static: "var(--cp-syntax-static)",
    string: "var(--cp-syntax-string)",
  },
  font: {
    body: "var(--font-sans)",
    mono: "var(--font-mono)",
    size: "13px",
    lineHeight: "24px",
  },
};

function SkipBackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M18.0618 4.13538C18.8928 3.58721 20 4.18326 20 5.17884V18.8213C20 19.8169 18.8928 20.413 18.0618 19.8648L7.71987 13.0436C6.97086 12.5495 6.97086 11.4507 7.71987 10.9566L18.0618 4.13538Z"
        fill="currentColor"
      />
      <path
        d="M4 4.75009C4 4.33588 4.33579 4.00009 4.75 4.00009C5.16421 4.00009 5.5 4.33588 5.5 4.75009V19.2501C5.5 19.6643 5.16421 20.0001 4.75 20.0001C4.33579 20.0001 4 19.6643 4 19.2501V4.75009Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LineNumbersIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.84025 3.00553C9.25145 3.05537 9.54439 3.42912 9.49455 3.84032L9.11155 7.00008H16.1006L16.5054 3.65983C16.5553 3.24862 16.929 2.95568 17.3402 3.00553C17.7515 3.05537 18.0444 3.42912 17.9946 3.84032L17.6116 7.00008H20.25C20.6642 7.00008 21 7.33586 21 7.75008C21 8.16429 20.6642 8.50008 20.25 8.50008H17.4297L16.5812 15.5001H20.25C20.6642 15.5001 21 15.8359 21 16.2501C21 16.6643 20.6642 17.0001 20.25 17.0001H16.3994L15.9946 20.3403C15.9447 20.7515 15.571 21.0445 15.1598 20.9946C14.7485 20.9448 14.4556 20.571 14.5054 20.1598L14.8884 17.0001H7.89943L7.49455 20.3403C7.44471 20.7515 7.07096 21.0445 6.65975 20.9946C6.24855 20.9448 5.95561 20.571 6.00545 20.1598L6.38845 17.0001H3.75C3.33579 17.0001 3 16.6643 3 16.2501C3 15.8359 3.33579 15.5001 3.75 15.5001H6.57027L7.41875 8.50008H3.75C3.33579 8.50008 3 8.16429 3 7.75008C3 7.33586 3.33579 7.00008 3.75 7.00008H7.60057L8.00545 3.65983C8.05529 3.24862 8.42904 2.95568 8.84025 3.00553ZM8.92973 8.50008L8.08125 15.5001H15.0703L15.9188 8.50008H8.92973Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4.75 4.5C4.61193 4.5 4.5 4.61193 4.5 4.75V8C4.5 8.41421 4.16421 8.75 3.75 8.75C3.33579 8.75 3 8.41421 3 8V4.75C3 3.7835 3.7835 3 4.75 3H8C8.41421 3 8.75 3.33579 8.75 3.75C8.75 4.16421 8.41421 4.5 8 4.5H4.75Z"
        fill="currentColor"
      />
      <path
        d="M15.25 3.75C15.25 3.33579 15.5858 3 16 3H19.25C20.2165 3 21 3.7835 21 4.75V8C21 8.41421 20.6642 8.75 20.25 8.75C19.8358 8.75 19.5 8.41421 19.5 8V4.75C19.5 4.61193 19.3881 4.5 19.25 4.5H16C15.5858 4.5 15.25 4.16421 15.25 3.75Z"
        fill="currentColor"
      />
      <path
        d="M3.75 15.25C4.16421 15.25 4.5 15.5858 4.5 16V19.25C4.5 19.3881 4.61193 19.5 4.75 19.5H8C8.41421 19.5 8.75 19.8358 8.75 20.25C8.75 20.6642 8.41421 21 8 21H4.75C3.7835 21 3 20.2165 3 19.25V16C3 15.5858 3.33579 15.25 3.75 15.25Z"
        fill="currentColor"
      />
      <path
        d="M20.25 15.25C20.6642 15.25 21 15.5858 21 16V19.25C21 20.2165 20.2165 21 19.25 21H16C15.5858 21 15.25 20.6642 15.25 20.25C15.25 19.8358 15.5858 19.5 16 19.5H19.25C19.3881 19.5 19.5 19.3881 19.5 19.25V16C19.5 15.5858 19.8358 15.25 20.25 15.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.47852 12C4.47852 7.85786 7.83638 4.5 11.9785 4.5C14.4012 4.5 16.0555 5.46268 17.7064 7.25H15.25C14.8358 7.25 14.5 7.58579 14.5 8C14.5 8.41421 14.8358 8.75 15.25 8.75H18.75C19.4404 8.75 20 8.19036 20 7.5V4C20 3.58579 19.6642 3.25 19.25 3.25C18.8358 3.25 18.5 3.58579 18.5 4V5.90778C16.7377 4.10436 14.7767 3 11.9785 3C7.00795 3 2.97852 7.02944 2.97852 12C2.97852 16.9706 7.00795 21 11.9785 21C15.8983 21 19.2311 18.4945 20.4662 14.9999C20.6042 14.6094 20.3995 14.1809 20.009 14.0429C19.6185 13.9048 19.19 14.1095 19.0519 14.5001C18.022 17.4141 15.2429 19.5 11.9785 19.5C7.83638 19.5 4.47852 16.1421 4.47852 12Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HeaderButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="group flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--cp-gray-1100)] hover:bg-[color:var(--cp-gray-300)] hover:text-[color:var(--cp-gray-1200)]"
    >
      {children}
    </button>
  );
}

function PlaygroundHeader({
  title,
  onFullscreen,
  onToggleLineNumbers,
}: {
  title: string;
  onFullscreen: () => void;
  onToggleLineNumbers: () => void;
}) {
  const { sandpack } = useSandpack();
  const { refresh } = useSandpackNavigation();
  const reset = () => sandpack.resetAllFiles();
  return (
    <header className="flex h-12 w-full items-center justify-between bg-white pl-4 pr-2">
      <span className="font-medium text-[color:var(--cp-gray-1200)]">
        {title}
      </span>
      <div className="flex">
        <HeaderButton onClick={reset} label="Reset code">
          <SkipBackIcon />
        </HeaderButton>
        <HeaderButton onClick={onToggleLineNumbers} label="Toggle line numbers">
          <LineNumbersIcon />
        </HeaderButton>
        <HeaderButton onClick={onFullscreen} label="Toggle fullscreen">
          <FullscreenIcon />
        </HeaderButton>
        <HeaderButton onClick={refresh} label="Refresh preview">
          <RefreshIcon />
        </HeaderButton>
      </div>
    </header>
  );
}

export function CodePlayground({
  files,
  title = "Code Playground",
  template = "react",
  showPreview = true,
}: CodePlaygroundProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  return (
    <div className="code-playground lg:-mx-32 xl:-mx-56">
      <div
        className={
          fullscreen
            ? "mobile-full-width col-span-3 !col-start-1 mx-auto !mt-0 w-full max-w-7xl"
            : "mobile-full-width col-span-3 !col-start-1 mx-auto my-7 w-full max-w-7xl"
        }
      >
        <SandpackProvider
          template={template}
          files={files}
          theme={theme}
          options={{
            visibleFiles: Object.keys(files),
            activeFile:
              Object.keys(files).find(
                (file) => file.endsWith(".js") || file.endsWith(".tsx"),
              ) ?? Object.keys(files)[0],
            externalResources: [
              "https://cdn.tailwindcss.com",
              "https://animations.dev/sandpack-style.css",
            ],
          }}
          customSetup={{
            dependencies: {
              "framer-motion": "11.0.24",
              "react-use-measure": "latest",
              clsx: "latest",
              "usehooks-ts": "latest",
            },
          }}
          style={{ height: "100%", display: "block" }}
        >
          <div
            className={
              fullscreen
                ? "code-playground__shell fixed inset-0 z-[100] flex flex-col gap-px overflow-hidden rounded-none bg-[color:var(--cp-gray-400)] text-[13px]"
                : "code-playground__shell flex flex-col gap-px overflow-hidden rounded-none bg-[color:var(--cp-gray-400)] text-[13px] sm:rounded-xl"
            }
            style={{
              ["--sp-font-mono" as string]: "var(--font-mono)",
            }}
          >
            <PlaygroundHeader
              title={title}
              onFullscreen={() => setFullscreen((v) => !v)}
              onToggleLineNumbers={() => setShowLineNumbers((v) => !v)}
            />
            <div className="relative flex h-fit w-full flex-col lg:h-auto lg:flex-row">
              <div className="code-playground__panel">
                <SandpackCodeEditor
                  showTabs
                  showLineNumbers={showLineNumbers}
                  showInlineErrors
                  className="!h-full !w-full"
                  style={{
                    maxHeight: fullscreen ? "calc(100vh - 48px)" : "50vh",
                  }}
                />
              </div>
              {showPreview ? (
                <>
                  <button
                    type="button"
                    aria-label="Resize preview"
                    className="flex h-full w-3 flex-shrink-0 cursor-col-resize justify-center bg-white transition-colors hover:bg-[color:var(--cp-gray-200)]"
                  >
                    <span className="block h-full w-px bg-[color:var(--cp-gray-400)]" />
                  </button>
                  <div className="code-playground__panel code-playground__preview-panel relative select-none">
                    <div className="relative h-full min-h-[280px] w-full md:min-h-0">
                      <SandpackPreview
                        showOpenInCodeSandbox={false}
                        showRefreshButton={false}
                        showRestartButton={false}
                        className="!h-full !w-full"
                        style={{
                          height: fullscreen ? "calc(100vh - 48px)" : "100%",
                          minHeight: 280,
                          maxHeight: fullscreen ? undefined : "80vh",
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </SandpackProvider>
      </div>
    </div>
  );
}
