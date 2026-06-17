"use client";

import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";

const CHAT_POP_GIF = "/check.gif";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDialogAnimation } from "@/hooks/useDialogAnimation";

type Developer = {
  id: string;
  name: string;
  avatar: string;
  link: string;
};

const developers: Developer[] = [
  {
    id: "dev1",
    name: "Dev_allan",
    avatar: "/allan.webp",
    link: "https://chat.smctgroup.ph/direct/DevunderscoreAllandashj",
  },
  {
    id: "dev2",
    name: "Dev_jenecil",
    avatar: "/jenecil.jpg",
    link: "https://chat.smctgroup.ph/direct/dev_jenecil",
  },
  {
    id: "dev3",
    name: "Dev_Macmac",
    avatar: "/Macmac.jpg",
    link: "https://chat.smctgroup.ph/direct/Dev-IT_Macmac",
  },
  {
    id: "dev4",
    name: "Dev_zart",
    avatar: "/zart.jpg",
    link: "https://chat.smctgroup.ph/direct/dev_zart",
  },
  {
    id: "dev5",
    name: "Dev_tian",
    avatar: "/Tian.jpg",
    link: "https://chat.smctgroup.ph/direct/dev_tian",
  },
];

function formatDevName(raw: string): string {
  return raw.replace(/^Dev[_-]/i, "Dev ");
}

interface ContactDevsModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
}

export default function ContactDevsModal({
  isOpen,
  onCloseAction,
}: ContactDevsModalProps) {
  const dialogAnimationClass = useDialogAnimation({ duration: 0.35 });

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90dvh,42rem)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden p-0 shadow-xl sm:max-w-lg",
          dialogAnimationClass
        )}
      >
        <DialogHeader className="relative shrink-0 overflow-hidden border-b border-blue-400/40 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-5 py-5 text-left text-white sm:px-6">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.08]"
            style={{
              backgroundImage: "url(/smct.png)",
              backgroundSize: "cover",
            }}
            aria-hidden
          />

          <div className="relative z-10 flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/25">
              <Users className="h-6 w-6 text-blue-100" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                Contact the dev team
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed text-blue-100/95">
                Reach out on SMCT Chat for bugs, features, or anything blocking
                your work.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-5 py-5 sm:px-6">
          <div className="mb-4 flex gap-3 rounded-xl border border-blue-100/80 bg-blue-50/60 px-3.5 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
              Tap a developer to open a direct chat in a new tab. A short
              message with context helps us reply faster.
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl border border-slate-200/90 bg-white p-2 shadow-sm sm:p-3",
              "max-h-[min(40vh,17.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain",
              "scrollbar-thin scrollbar-thumb-blue-300/60 scrollbar-track-slate-100"
            )}
          >
            <div className="grid grid-cols-2 gap-3 px-1 pb-2 pt-2 sm:grid-cols-3 sm:gap-4">
              {developers.map((dev) => (
                <Link
                  key={dev.id}
                  href={dev.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Message ${formatDevName(dev.name)} on SMCT Chat`}
                  className={cn(
                    "group relative z-0 flex flex-col items-center gap-2 overflow-visible rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 text-center",
                    "transition-all duration-200 ease-out hover:z-10",
                    "hover:border-blue-300 hover:bg-white hover:shadow-md hover:-translate-y-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  )}
                >
                  {/* Chat bubble gif at top-right corner on hover */}
                  <span
                    className={cn(
                      "pointer-events-none absolute top-1 right-1 z-20 h-10 w-10 origin-bottom-left sm:h-11 sm:w-11",
                      "overflow-hidden rounded-2xl border-2 border-transparent bg-white/90 shadow-sm",
                      "opacity-0 scale-50 transition-all duration-300 ease-in-out",
                      "motion-safe:group-hover:-top-0.5 motion-safe:group-hover:-right-0.5 motion-safe:group-hover:scale-100",
                      "group-hover:border-blue-400/90 group-hover:opacity-100 group-hover:shadow-md"
                    )}
                    aria-hidden
                  >
                    <img
                      src={CHAT_POP_GIF}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </span>

                  <div className="relative">
                    <img
                      src={dev.avatar}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-md transition-all duration-200 group-hover:ring-blue-300 sm:h-[3.75rem] sm:w-[3.75rem]"
                    />
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="block truncate text-xs font-semibold text-slate-800 group-hover:text-blue-700 sm:text-sm">
                      {formatDevName(dev.name)}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium text-slate-500 transition-colors group-hover:text-blue-600">
                      Open chat →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer border-slate-300 bg-red-600 hover:bg-red-700 text-white hover:text-white sm:ml-auto sm:w-auto"
            onClick={onCloseAction}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
