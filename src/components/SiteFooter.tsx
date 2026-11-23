import { A } from "@solidjs/router";
import type { Component } from "solid-js";
import { t } from "~/lib/i18n";

export const SiteFooter: Component = () => {
	return (
		<footer class="border-t border-border py-12 px-6 bg-card/40 mt-auto">
			<div class="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
				<div class="flex flex-col items-center md:items-start gap-1">
					<div class="flex items-center gap-2 font-bold text-foreground">
						<img
							src="/logo.png"
							alt="EditNovel logo"
							class="w-5 h-5 object-contain"
						/>
						<span>EditNovel Studio</span>
					</div>
					<p>{t("home.footer")}</p>
				</div>

				<nav
					class="flex flex-wrap items-center justify-center gap-6"
					aria-label={t("nav.footerNavAria")}
				>
					<A href="/" class="hover:text-foreground transition-colors">
						{t("nav.editor")}
					</A>
					<A href="/home" class="hover:text-foreground transition-colors">
						{t("nav.home")}
					</A>
					<A href="/features" class="hover:text-foreground transition-colors">
						{t("nav.features")}
					</A>
					<A href="/faq" class="hover:text-foreground transition-colors">
						{t("nav.faq")}
					</A>
					<A href="/about" class="hover:text-foreground transition-colors">
						{t("nav.about")}
					</A>
					<a
						href="/llms.txt"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-foreground transition-colors font-mono text-[11px]"
					>
						{t("nav.llmsTxt")}
					</a>
				</nav>
			</div>
		</footer>
	);
};
