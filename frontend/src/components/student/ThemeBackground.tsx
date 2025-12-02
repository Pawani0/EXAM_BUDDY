import { useEffect, useState } from "react";
import { AnimatedBackground } from "./AnimatedBackground";
import { AnimatedBackgroundLight } from "./AnimatedBackgroundLight";

export const ThemeBackground = () => {
    const [theme, setTheme] = useState<string>("dark");

    useEffect(() => {
        // Check initial theme
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");

        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    const isDark = document.documentElement.classList.contains("dark");
                    setTheme(isDark ? "dark" : "light");
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    return theme === "dark" ? <AnimatedBackground /> : <AnimatedBackgroundLight />;
};
