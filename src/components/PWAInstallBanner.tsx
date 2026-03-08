import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export const PWAInstallBanner = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm text-foreground">Install NotifyAI</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access & offline support</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={install} className="bg-gradient-maroon text-primary-foreground gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Install App
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} className="text-xs text-muted-foreground">
                  Not now
                </Button>
              </div>
            </div>
            <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
