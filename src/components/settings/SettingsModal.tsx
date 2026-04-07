"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SettingsContent from "./SettingsContent";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={true}
        className="max-w-xl w-full rounded-none sm:rounded-none p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] bg-white dark:bg-[#111111] text-black ring-gray-300"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 shrink-0">
          <DialogTitle className="font-display text-2xl font-bold leading-none tracking-tighter text-black">
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-6 flex-1">
          <SettingsContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
