import { motion } from "framer-motion";
import { Bot } from "lucide-react";

const AppHeader = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                PromoBank
              </h1>
              <p className="text-xs text-muted-foreground leading-none">
                Automação de Chamados com IA
              </p>
            </div>
          </motion.div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-accent/20 text-accent-foreground px-2.5 py-1 rounded-full font-medium border border-accent/30">
              v2.0
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
