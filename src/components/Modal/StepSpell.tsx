import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ExternalLink,
	Languages,
	Loader2,
	Plus,
	Search,
	Settings,
	SpellCheck2,
	X,
} from "lucide-solid";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
	acceptAllSpellCorrections,
	addIgnoredWord,
	discardAllSpellCorrections,
	removeIgnoredWord,
	setModalModeWithTransition,
	setRightPaneMode,
	setSpellLanguageMode,
	state,
	toggleSpellCorrection,
	toggleSpellIgnoreForeign,
	toggleSpellIgnoreJapanese,
	toggleSpellIgnoreProperNouns,
	toggleVolumeSpell,
} from "~/lib/store";

export const StepSpell: Component = () => {
	const [selectedVolume, setSelectedVolume] = createSignal<string>("all");
	const [filterMode, setFilterMode] = createSignal<
		"all" | "smells" | "discarded"
	>("all");
	const [searchQuery, setSearchQuery] = createSignal("");
	const [newWordInput, setNewWordInput] = createSignal("");
	const [showConfig, setShowConfig] = createSignal(false);

	const activeVolumeId = () =>
		selectedVolume() === "all" ? undefined : selectedVolume();

	const volumeCorrections = createMemo(() => {
		const vol = activeVolumeId();
		if (!vol) return state.spellCorrections;
		return state.spellCorrections.filter((c) => c.fileId === vol);
	});

	const totalCount = createMemo(() => volumeCorrections().length);
	const smellCount = createMemo(
		() => volumeCorrections().filter((c) => c.isSmell).length,
	);
	const safeCount = createMemo(
		() => volumeCorrections().filter((c) => !c.isSmell && c.enabled).length,
	);
	const disabledCount = createMemo(
		() => volumeCorrections().filter((c) => !c.enabled).length,
	);

	const filteredCorrections = createMemo(() => {
		let list = volumeCorrections();
		const mode = filterMode();
		if (mode === "smells") {
			list = list.filter((c) => c.isSmell);
		} else if (mode === "discarded") {
			list = list.filter((c) => !c.enabled);
		}

		const query = searchQuery().trim().toLowerCase();
		if (query) {
			list = list.filter(
				(c) =>
					c.originalToken.toLowerCase().includes(query) ||
					c.replacementToken.toLowerCase().includes(query) ||
					c.sectionTitle.toLowerCase().includes(query) ||
					c.contextSnippet.toLowerCase().includes(query),
			);
		}
		return list;
	});

	const isCurrentVolumeEnabled = () => {
		const vol = activeVolumeId();
		if (!vol) return true;
		return state.spellVolumeSettings[vol] !== false;
	};

	const handleAddWord = (e: Event) => {
		e.preventDefault();
		const w = newWordInput().trim();
		if (w) {
			addIgnoredWord(w);
			setNewWordInput("");
		}
	};

	const getCategoryLabel = (cat: string) => {
		if (cat === "typo") return t("correctionPanel.typo");
		if (cat === "casing") return t("correctionPanel.casing");
		if (cat === "punctuation") return t("correctionPanel.punctuation");
		if (cat === "grammar") return t("correctionPanel.grammar");
		if (cat === "smell") return t("correctionPanel.smell");
		if (cat === "style") return t("correctionPanel.style");
		return cat;
	};

	return (
		<div class="flex flex-col gap-5 py-1">
			<div class="flex items-center justify-end gap-3 pb-3 border-b border-border/70 w-full">
				<div class="flex items-center gap-2.5">
					<button
						type="button"
						onClick={() => {
							setRightPaneMode("spell");
							setModalModeWithTransition("docked");
						}}
						class="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
					>
						<ExternalLink class="w-3.5 h-3.5" />
						<span>{t("correctionPanel.goToEditorPanel")}</span>
					</button>

					<button
						type="button"
						onClick={() => setShowConfig((prev) => !prev)}
						class={`p-2 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
							showConfig()
								? "border-primary bg-primary/10 text-primary"
								: "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
						}`}
						title={t("stepSpell.linguisticFilters")}
						aria-label={t("stepSpell.linguisticFilters")}
					>
						<Settings class="w-4 h-4" />
					</button>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				<div class="p-3 rounded-xl border border-border bg-card/60 flex flex-col gap-1 shadow-2xs">
					<span class="text-[11px] text-muted-foreground font-medium">
						{t("stepSpell.metricsTotal")}
					</span>
					<span class="text-lg font-bold text-foreground">
						{totalCount()}
						<Show when={state.isProcessing}>
							<Loader2 class="w-3.5 h-3.5 animate-spin text-primary inline-block ml-1.5" />
						</Show>
					</span>
				</div>

				<div class="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-1 shadow-2xs">
					<span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
						<CheckCircle2 class="w-3.5 h-3.5" />
						{t("stepSpell.metricsSafe")}
					</span>
					<span class="text-lg font-bold text-emerald-700 dark:text-emerald-300">
						{safeCount()}
					</span>
				</div>

				<div class="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-1 shadow-2xs">
					<span class="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
						<AlertTriangle class="w-3.5 h-3.5" />
						{t("stepSpell.metricsSmells")}
					</span>
					<span class="text-lg font-bold text-amber-600 dark:text-amber-400">
						{smellCount()}
					</span>
				</div>
			</div>

			<Show when={showConfig()}>
				<div class="p-4 rounded-xl border border-border bg-secondary/30 flex flex-col gap-4 transition-all">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
						<div class="flex flex-col">
							<span class="text-xs font-semibold text-foreground">
								{t("stepSpell.languageMode")}
							</span>
							<span class="text-[11px] text-muted-foreground">
								Selecciona la estrategia de análisis lingüístico.
							</span>
						</div>
						<div class="flex items-center gap-1 p-1 rounded-lg border border-border bg-background">
							<button
								type="button"
								onClick={() => setSpellLanguageMode("hybrid")}
								class={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
									state.spellLanguageMode === "hybrid"
										? "bg-primary text-primary-foreground shadow-2xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{t("stepSpell.hybridMode")}
							</button>
							<button
								type="button"
								onClick={() => setSpellLanguageMode("es")}
								class={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
									state.spellLanguageMode === "es"
										? "bg-primary text-primary-foreground shadow-2xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{t("stepSpell.spanishOnly")}
							</button>
							<button
								type="button"
								onClick={() => setSpellLanguageMode("en")}
								class={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
									state.spellLanguageMode === "en"
										? "bg-primary text-primary-foreground shadow-2xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{t("stepSpell.englishOnly")}
							</button>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<label class="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background cursor-pointer hover:bg-secondary/40 transition-colors">
							<input
								type="checkbox"
								checked={state.spellIgnoreJapanese}
								onChange={() => toggleSpellIgnoreJapanese()}
								class="rounded border-border text-primary focus:ring-ring mt-0.5 w-4 h-4 cursor-pointer"
							/>
							<div class="flex flex-col">
								<span class="text-xs font-medium text-foreground">
									{t("stepSpell.ignoreJapanese")}
								</span>
								<span class="text-[11px] text-muted-foreground leading-snug">
									{t("stepSpell.ignoreJapaneseDesc")}
								</span>
							</div>
						</label>

						<label class="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background cursor-pointer hover:bg-secondary/40 transition-colors">
							<input
								type="checkbox"
								checked={state.spellIgnoreForeign}
								onChange={() => toggleSpellIgnoreForeign()}
								class="rounded border-border text-primary focus:ring-ring mt-0.5 w-4 h-4 cursor-pointer"
							/>
							<div class="flex flex-col">
								<span class="text-xs font-medium text-foreground">
									{t("stepSpell.ignoreForeign")}
								</span>
								<span class="text-[11px] text-muted-foreground leading-snug">
									{t("stepSpell.ignoreForeignDesc")}
								</span>
							</div>
						</label>

						<label class="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background cursor-pointer hover:bg-secondary/40 transition-colors">
							<input
								type="checkbox"
								checked={state.spellIgnoreProperNouns}
								onChange={() => toggleSpellIgnoreProperNouns()}
								class="rounded border-border text-primary focus:ring-ring mt-0.5 w-4 h-4 cursor-pointer"
							/>
							<div class="flex flex-col">
								<span class="text-xs font-medium text-foreground">
									{t("stepSpell.ignoreProperNouns")}
								</span>
								<span class="text-[11px] text-muted-foreground leading-snug">
									{t("stepSpell.ignoreProperNounsDesc")}
								</span>
							</div>
						</label>
					</div>

					<div class="flex flex-col gap-2 pt-2 border-t border-border/50">
						<div class="flex items-center justify-between">
							<span class="text-xs font-semibold text-foreground">
								{t("stepSpell.ignoredWordsTitle")}
							</span>
							<span class="text-[11px] text-muted-foreground">
								{t("stepSpell.protectedWordsCount", { count: state.spellIgnoredWords.length })}
							</span>
						</div>

						<form onSubmit={handleAddWord} class="flex gap-2">
							<input
								type="text"
								value={newWordInput()}
								onInput={(e) => setNewWordInput(e.currentTarget.value)}
								placeholder={t("stepSpell.addIgnoredWordPlaceholder")}
								class="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							/>
							<button
								type="submit"
								class="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1 hover:opacity-90 cursor-pointer shadow-2xs"
							>
								<Plus class="w-3.5 h-3.5" />
								<span>{t("stepSpell.addWord")}</span>
							</button>
						</form>

						<div class="flex flex-wrap gap-1.5 min-h-[30px] p-2 rounded-lg border border-dashed border-border bg-background/50">
							<For
								each={state.spellIgnoredWords}
								fallback={
									<span class="text-xs text-muted-foreground italic">
										{t("stepSpell.noIgnoredWords")}
									</span>
								}
							>
								{(word) => (
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-mono">
										{word}
										<button
											type="button"
											onClick={() => removeIgnoredWord(word)}
											class="text-muted-foreground hover:text-destructive cursor-pointer"
										>
											<X class="w-3 h-3" />
										</button>
									</span>
								)}
							</For>
						</div>
					</div>
				</div>
			</Show>

			<div class="flex flex-col gap-3">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
					<div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
						<button
							type="button"
							onClick={() => setSelectedVolume("all")}
							class={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
								selectedVolume() === "all"
									? "bg-primary text-primary-foreground font-semibold shadow-2xs"
									: "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
							}`}
						>
							{t("stepSpell.allVolumes")} ({state.spellCorrections.length})
						</button>

						<For each={state.files}>
							{(file, idx) => {
								const count = () =>
									state.spellCorrections.filter((c) => c.fileId === file.name)
										.length;
								const isSelected = () => selectedVolume() === file.name;
								const isVolEnabled = () =>
									state.spellVolumeSettings[file.name] !== false;

								return (
									<button
										type="button"
										onClick={() => setSelectedVolume(file.name)}
										class={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
											isSelected()
												? "bg-primary text-primary-foreground font-semibold shadow-2xs"
												: "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
										}`}
									>
										<span>Vol. {idx() + 1}</span>
										<span
											class={`px-1.5 py-0.2 rounded text-[10px] ${
												isSelected()
													? "bg-primary-foreground/20 text-primary-foreground"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{count()}
										</span>
										<Show when={!isVolEnabled()}>
											<span class="w-1.5 h-1.5 rounded-full bg-destructive" />
										</Show>
									</button>
								);
							}}
						</For>
					</div>

					<Show when={activeVolumeId()}>
						{(volId) => (
							<div class="flex items-center gap-2 self-end sm:self-auto px-3 py-1 rounded-lg border border-border bg-card">
								<span class="text-xs font-medium text-foreground">
									{t("stepSpell.volumeToggle")}
								</span>
								<button
									type="button"
									role="switch"
									aria-checked={isCurrentVolumeEnabled()}
									onClick={() => toggleVolumeSpell(volId())}
									class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
										isCurrentVolumeEnabled() ? "bg-primary" : "bg-muted"
									}`}
								>
									<span
										class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
											isCurrentVolumeEnabled()
												? "translate-x-4"
												: "translate-x-0"
										}`}
									/>
								</button>
							</div>
						)}
					</Show>
				</div>

				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-xl border border-border bg-card/40">
					<div class="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setFilterMode("all")}
							class={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
								filterMode() === "all"
									? "bg-secondary text-foreground font-semibold"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{t("stepSpell.filterAll", { count: totalCount() })}
						</button>
						<button
							type="button"
							onClick={() => setFilterMode("smells")}
							class={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
								filterMode() === "smells"
									? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<AlertTriangle class="w-3 h-3 text-amber-500" />
							{t("stepSpell.filterSmells", { count: smellCount() })}
						</button>
						<button
							type="button"
							onClick={() => setFilterMode("discarded")}
							class={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
								filterMode() === "discarded"
									? "bg-destructive/10 text-destructive font-semibold"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{t("stepSpell.filterDiscarded", { count: disabledCount() })}
						</button>
					</div>

					<div class="flex items-center gap-2">
						<div class="relative flex-1 sm:w-56">
							<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
							<input
								type="text"
								value={searchQuery()}
								onInput={(e) => setSearchQuery(e.currentTarget.value)}
								placeholder={t("stepSpell.searchPlaceholder")}
								class="w-full pl-8 pr-3 py-1 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							/>
						</div>

						<button
							type="button"
							onClick={() => acceptAllSpellCorrections(activeVolumeId())}
							class="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
						>
							{t("stepSpell.acceptAll")}
						</button>
						<button
							type="button"
							onClick={() => discardAllSpellCorrections(activeVolumeId())}
							class="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
						>
							{t("stepSpell.discardAll")}
						</button>
					</div>
				</div>

				<div class="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
					<For
						each={filteredCorrections()}
						fallback={
							<Show
								when={state.isProcessing && totalCount() === 0}
								fallback={
									<div class="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border text-center bg-card/20">
										<SpellCheck2 class="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
										<p class="text-xs font-medium text-foreground">
											{totalCount() === 0
												? t("stepSpell.noCorrectionsEver")
												: t("stepSpell.noCorrectionsFound")}
										</p>
									</div>
								}
							>
								<div class="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-primary/30 text-center bg-card/20 animate-pulse">
									<Loader2 class="w-8 h-8 text-primary mb-2 animate-spin" />
									<p class="text-xs font-semibold text-foreground">
										{t("stepFiles.parsingBackground")}
									</p>
									<p class="text-[11px] text-muted-foreground mt-1">
										{t("stepSpell.indexingNotice")}
									</p>
								</div>
							</Show>
						}
					>
						{(c) => {
							const isEnabled = () => c.enabled;

							return (
								<div
									class={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 ${
										c.isSmell && isEnabled()
											? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
											: isEnabled()
												? "border-border bg-card hover:border-border/80 shadow-2xs"
												: "border-border/50 bg-secondary/20 opacity-60 hover:opacity-90"
									}`}
								>
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
										<div class="flex flex-wrap items-center gap-1.5">
											<span class="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-secondary text-secondary-foreground">
												{c.sectionTitle}
											</span>
											<span class="px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted">
												{t("stepSpell.pageBadge", { page: c.pageNum })}
											</span>
											<span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary">
												{c.language}
											</span>
											<span class="px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground bg-muted">
												{getCategoryLabel(c.category)}
											</span>
											<Show
												when={c.isSmell}
												fallback={
													<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
														<CheckCircle2 class="w-3 h-3" />
														{t("stepSpell.safeBadge")}
													</span>
												}
											>
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
													<AlertTriangle class="w-3 h-3" />
													{t("stepSpell.smellWarning")}
												</span>
											</Show>
										</div>

										<div class="flex items-center gap-2 self-end sm:self-auto">
											<button
												type="button"
												onClick={() => addIgnoredWord(c.originalToken)}
												class="px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
												title={t("stepSpell.ignoreAlways")}
											>
												{t("stepSpell.ignoreAlways")}
											</button>

											<button
												type="button"
												onClick={() => toggleSpellCorrection(c.id)}
												class={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
													isEnabled()
														? "bg-emerald-600 text-white hover:bg-emerald-700"
														: "bg-secondary text-muted-foreground hover:text-foreground"
												}`}
											>
												<Show
													when={isEnabled()}
													fallback={<X class="w-3.5 h-3.5" />}
												>
													<Check class="w-3.5 h-3.5" />
												</Show>
												<span>{isEnabled() ? t("stepSpell.statusActive") : t("stepSpell.statusSkipped")}</span>
											</button>
										</div>
									</div>

									<div class="flex items-center gap-2.5 pt-1">
										<span class="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive line-through font-mono text-xs font-semibold">
											{c.originalToken}
										</span>
										<span class="text-xs text-muted-foreground font-bold">
											→
										</span>
										<span class="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold">
											{c.replacementToken}
										</span>
									</div>

									<div class="text-xs text-muted-foreground font-serif bg-secondary/30 p-2.5 rounded-lg border border-border/40 italic leading-relaxed">
										"{c.contextSnippet}"
									</div>
								</div>
							);
						}}
					</For>
				</div>
			</div>
		</div>
	);
};
