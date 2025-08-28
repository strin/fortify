import { useState, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface IProps {
  onAddSource?: () => void;
  onGoBack?: () => void;
  showGoBack?: boolean;
  currentPath: string;
  setCurrentPath?: (path: string) => void;
  creatorId: number;
  tools?: ReactElement[] | ReactElement;
}

export function Path({
  path,
  setPath,
}: {
  path: string;
  setPath?: (path: string) => void;
}) {
  const parts = path.split("/");
  const firstPart = parts.length > 0 ? parts[0] : null;
  if (!firstPart) {
    return null;
  }

  return (
    <div className="ml-3 flex items-center">
      <div className="flex items-center">
        <p className="flex flex-row items-center" style={{ maxWidth: "6rem" }}>
          <p
            className="truncate text-sm cursor-pointer"
            onClick={() => setPath && setPath(firstPart)}
          >
            {firstPart}
          </p>
        </p>
        {parts.length > 3 && (
          <p
            className="flex flex-row items-center"
            style={{ maxWidth: "6rem" }}
          >
            <ChevronRight className="w-3 h-3 ml-1" />
            <p className="ml-1">...</p>
          </p>
        )}
        {parts.length > 2 && (
          <p
            className="flex flex-row items-center"
            style={{ maxWidth: "6rem" }}
          >
            <ChevronRight className="w-3 h-3 ml-1" />
            <p
              className="ml-1 truncate text-sm cursor-pointer"
              onClick={() =>
                setPath && setPath(parts.slice(0, parts.length - 1).join("/"))
              }
            >
              {parts[parts.length - 2]}
            </p>
          </p>
        )}
        {parts.length > 1 && (
          <p
            className="flex flex-row items-center"
            style={{ maxWidth: "6rem" }}
          >
            <ChevronRight className="w-3 h-3 ml-1" />
            <p
              className="ml-1 truncate text-sm cursor-pointer"
              onClick={() =>
                setPath && setPath(parts.slice(0, parts.length).join("/"))
              }
            >
              {parts[parts.length - 1]}
            </p>
          </p>
        )}
      </div>
    </div>
  );
}

export default function Toolbar(props: IProps) {
  return (
    <div className=" flex h-[50px] items-center justify-between rounded-t-md border-b border-panel-border-light bg-panel-header-light px-2 dark:border-panel-border-dark dark:bg-panel-header-dark">
      <div className="flex items-center ">
        <button
          onClick={() => {
            props.onGoBack && props.onGoBack();
          }}
          type="button"
          disabled={!props.showGoBack}
          className="relative iems-center justify-center cursor-pointer inline-flex items-center space-x-2 text-center font-regular ease-out duration-200 rounded-md outline-none transition-all outline-0 focus-visible:outline-4 focus-visible:outline-offset-1 border text-scale-1200 hover:bg-scale-500 disabled:opacity-30 shadow-none focus-visible:outline-scale-700 border-transparent text-xs px-2.5 py-1 opacity-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="sbui-icon "
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>{" "}
        </button>

        <Path path={props.currentPath} setPath={props.setCurrentPath} />
      </div>
      {props.tools}
    </div>
  );
}
