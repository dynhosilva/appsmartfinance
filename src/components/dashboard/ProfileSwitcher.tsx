import { motion } from "framer-motion";
import { User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinancialProfile = "personal" | "business";

interface ProfileSwitcherProps {
  currentProfile: FinancialProfile;
  onProfileChange: (profile: FinancialProfile) => void;
}

const ProfileSwitcher = ({ currentProfile, onProfileChange }: ProfileSwitcherProps) => {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-xl">
      <button
        onClick={() => onProfileChange("personal")}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          currentProfile === "personal"
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {currentProfile === "personal" && (
          <motion.div
            layoutId="profile-switcher-bg"
            className="absolute inset-0 bg-gradient-to-r from-primary to-primary-glow rounded-lg"
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <User className="h-4 w-4" />
          Pessoal
        </span>
      </button>
      
      <button
        onClick={() => onProfileChange("business")}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          currentProfile === "business"
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {currentProfile === "business" && (
          <motion.div
            layoutId="profile-switcher-bg"
            className="absolute inset-0 bg-gradient-to-r from-secondary to-info rounded-lg"
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresarial
        </span>
      </button>
    </div>
  );
};

export default ProfileSwitcher;
