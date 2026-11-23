import { ChevronRight } from "lucide-solid";
import {
  type Component,
  createContext,
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  type ParentComponent,
  Show,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";

interface ContextMenuContextValue {
  onClose: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue>();

export interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  class?: string;
  floatingToolbar?: JSX.Element;
  children: JSX.Element;
}

export const ContextMenu: Component<ContextMenuProps> = (props) => {
  createEffect(() => {
    if (!props.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      props.onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("scroll", props.onClose, true);
    window.addEventListener("resize", props.onClose);

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("scroll", props.onClose, true);
      window.removeEventListener("resize", props.onClose);
    });
  });

  return (
    <Show when={props.isOpen}>
      <Portal>
        <ContextMenuContext.Provider value={{ onClose: props.onClose }}>
          <ContextMenuContent
            x={props.x}
            y={props.y}
            class={props.class}
            floatingToolbar={props.floatingToolbar}
          >
            {props.children}
          </ContextMenuContent>
        </ContextMenuContext.Provider>
      </Portal>
    </Show>
  );
};

interface ContextMenuContentProps {
  x: number;
  y: number;
  class?: string;
  floatingToolbar?: JSX.Element;
  children: JSX.Element;
}

const ContextMenuContent: Component<ContextMenuContentProps> = (props) => {
  let menuRef: HTMLDivElement | undefined;
  let toolbarRef: HTMLDivElement | undefined;
  const [menuCoords, setMenuCoords] = createSignal<{ x: number; y: number }>({
    x: props.x,
    y: props.y,
  });
  const [toolbarCoords, setToolbarCoords] = createSignal<{ x: number; y: number }>({
    x: props.x,
    y: Math.max(8, props.y - 44),
  });
  const [isPositioned, setIsPositioned] = createSignal(false);

  let rafId: number | null = null;

  createEffect(() => {
    const rawX = props.x;
    const rawY = props.y;
    setIsPositioned(false);
    setMenuCoords({ x: rawX, y: rawY });
    setToolbarCoords({ x: rawX, y: Math.max(8, rawY - 44) });

    if (typeof window === "undefined") return;

    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      if (!menuRef) return;
      const margin = 8;
      const gap = 6;
      const menuRect = menuRef.getBoundingClientRect();
      const toolbarRect = toolbarRef ? toolbarRef.getBoundingClientRect() : null;

      if (!toolbarRect) {
        let targetX = rawX;
        let targetY = rawY;

        if (targetX + menuRect.width > window.innerWidth - margin) {
          targetX = Math.max(margin, window.innerWidth - menuRect.width - margin);
        }
        if (targetY + menuRect.height > window.innerHeight - margin) {
          targetY = Math.max(margin, window.innerHeight - menuRect.height - margin);
        }

        setMenuCoords({ x: targetX, y: targetY });
        setIsPositioned(true);
        return;
      }

      const totalHeight = menuRect.height + gap + toolbarRect.height;
      let placeToolbarAbove = true;
      if (rawY - toolbarRect.height - gap < margin) {
        placeToolbarAbove = false;
      }

      let mY = rawY;
      let tY = rawY;

      if (placeToolbarAbove) {
        if (rawY + menuRect.height > window.innerHeight - margin) {
          mY = Math.max(
            margin + toolbarRect.height + gap,
            window.innerHeight - menuRect.height - margin
          );
        } else {
          mY = rawY;
        }
        tY = mY - toolbarRect.height - gap;
      } else {
        if (rawY + totalHeight > window.innerHeight - margin) {
          mY = Math.max(margin, window.innerHeight - totalHeight - margin);
        } else {
          mY = rawY;
        }
        tY = mY + menuRect.height + gap;
      }

      const maxWidth = Math.max(menuRect.width, toolbarRect.width);
      let targetX = rawX;
      if (targetX + maxWidth > window.innerWidth - margin) {
        targetX = Math.max(margin, window.innerWidth - maxWidth - margin);
      }

      setMenuCoords({ x: targetX, y: mY });
      setToolbarCoords({ x: targetX, y: tY });
      setIsPositioned(true);
    });

    onCleanup(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    });
  });

  return (
    <>
      <Show when={props.floatingToolbar}>
        <div
          ref={toolbarRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            left: `${toolbarCoords().x}px`,
            top: `${toolbarCoords().y}px`,
            visibility: isPositioned() ? "visible" : "hidden",
          }}
          class="fixed z-[101] rounded-xl border border-border bg-popover/95 text-popover-foreground p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
        >
          {props.floatingToolbar}
        </div>
      </Show>

      <div
        ref={menuRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{
          left: `${menuCoords().x}px`,
          top: `${menuCoords().y}px`,
          visibility: isPositioned() ? "visible" : "hidden",
        }}
        class={`fixed z-[100] rounded-xl border border-border bg-popover/95 text-popover-foreground p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none text-xs ${
          props.class || "min-w-[200px] max-w-[280px]"
        }`}
      >
        {props.children}
      </div>
    </>
  );
};

export const ContextMenuGroup: ParentComponent<{ class?: string }> = (props) => {
  return <div class={`flex flex-col gap-0.5 ${props.class || ""}`}>{props.children}</div>;
};

export const ContextMenuLabel: ParentComponent<{ class?: string }> = (props) => {
  return (
    <div
      class={`px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ${
        props.class || ""
      }`}
    >
      {props.children}
    </div>
  );
};

export const ContextMenuSeparator: Component = () => {
  return <div class="h-px bg-border/80 my-1 mx-1" />;
};

export interface ContextMenuItemProps {
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: JSX.Element;
  children: JSX.Element;
  shortcut?: string;
  class?: string;
}

export const ContextMenuItem: Component<ContextMenuItemProps> = (props) => {
  const ctx = useContext(ContextMenuContext);

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.disabled) return;
    props.onClick?.();
    ctx?.onClose();
  };

  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={handleClick}
      class={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer select-none font-medium ${
        props.destructive
          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
          : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
      } ${props.disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""} ${
        props.class || ""
      }`}
    >
      <Show when={props.icon}>
        <span class="shrink-0 opacity-80">{props.icon}</span>
      </Show>
      <span class="truncate flex-1">{props.children}</span>
      <Show when={props.shortcut}>
        <span class="ml-auto text-[10px] tracking-widest text-muted-foreground opacity-60">
          {props.shortcut}
        </span>
      </Show>
    </button>
  );
};

export const ContextMenuShortcut: ParentComponent<{ class?: string }> = (props) => {
  return (
    <span
      class={`ml-auto text-[10px] tracking-widest text-muted-foreground opacity-60 ${props.class || ""}`}
    >
      {props.children}
    </span>
  );
};

interface SubMenuContextValue {
  isOpen: () => boolean;
  setIsOpen: (open: boolean) => void;
  triggerRect: () => DOMRect | null;
  setTriggerRect: (rect: DOMRect | null) => void;
}

const SubMenuContext = createContext<SubMenuContextValue>();

export const ContextMenuSub: ParentComponent = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [triggerRect, setTriggerRect] = createSignal<DOMRect | null>(null);

  let timeoutId: number | null = null;

  const handleMouseEnter = () => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  onCleanup(() => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  });

  return (
    <SubMenuContext.Provider value={{ isOpen, setIsOpen, triggerRect, setTriggerRect }}>
      <div class="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {props.children}
      </div>
    </SubMenuContext.Provider>
  );
};

export interface ContextMenuSubTriggerProps {
  icon?: JSX.Element;
  children: JSX.Element;
  disabled?: boolean;
}

export const ContextMenuSubTrigger: Component<ContextMenuSubTriggerProps> = (props) => {
  const subCtx = useContext(SubMenuContext);
  let triggerRef: HTMLDivElement | undefined;

  const handleMouseEnter = () => {
    if (triggerRef) {
      subCtx?.setTriggerRect(triggerRef.getBoundingClientRect());
    }
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      class={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer select-none font-medium ${
        subCtx?.isOpen()
          ? "bg-accent text-accent-foreground"
          : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
      } ${props.disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}`}
    >
      <div class="flex items-center gap-2.5 truncate">
        <Show when={props.icon}>
          <span class="shrink-0 opacity-80">{props.icon}</span>
        </Show>
        <span class="truncate">{props.children}</span>
      </div>
      <ChevronRight class="w-3.5 h-3.5 opacity-60 shrink-0" />
    </div>
  );
};

export const ContextMenuSubContent: ParentComponent = (props) => {
  const subCtx = useContext(SubMenuContext);
  let subRef: HTMLDivElement | undefined;
  const [coords, setCoords] = createSignal<{ left: string; right?: string; top: string }>({
    left: "100%",
    top: "-4px",
  });

  createEffect(() => {
    if (!subCtx?.isOpen() || !subRef) return;
    const rect = subRef.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      setCoords({ left: "auto", right: "100%", top: "-4px" });
    } else {
      setCoords({ left: "100%", top: "-4px" });
    }
  });

  return (
    <Show when={subCtx?.isOpen()}>
      <div
        ref={subRef}
        style={{
          left: coords().left,
          right: coords().right,
          top: coords().top,
        }}
        class="absolute z-[100] min-w-[170px] max-w-[240px] rounded-xl border border-border bg-popover/95 text-popover-foreground p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none text-xs ml-1 mr-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex flex-col gap-0.5">{props.children}</div>
      </div>
    </Show>
  );
};
