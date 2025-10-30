import React from "react";
import { useTranslation } from "../helpers/useTranslation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import styles from "./LanguageSwitch.module.css";

const languageOptions = [
  { value: "ka", label: "ქართული", flag: "🇬🇪" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

export const LanguageSwitch = ({ className }: { className?: string }) => {
  const { language, setLanguage } = useTranslation();

  const handleLanguageChange = (value: string) => {
    if (value === "ka" || value === "en") {
      setLanguage(value);
    }
  };

  const selectedOption = languageOptions.find((opt) => opt.value === language);

  return (
    <Select onValueChange={handleLanguageChange} value={language}>
      <SelectTrigger className={`${styles.trigger} ${className || ""}`}>
        <SelectValue asChild>
          <div className={styles.selectValue}>
            <span>{selectedOption?.flag}</span>
            <span className={styles.labelDesktop}>{selectedOption?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languageOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className={styles.selectItem}>
              <span>{option.flag}</span>
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};