"use client";

import { useState } from "react";
import { createTournament, type TournamentType } from "@/app/actions/tournaments";

export function CreateTournamentForm() {
  const [tournamentType, setTournamentType] = useState<TournamentType>("LEAGUE");

  return (
    <form
      action={async (formData) => {
        const title = String(formData.get("title") ?? "");
        const gameName = String(formData.get("gameName") ?? "FC 26");
        const type = String(formData.get("type") ?? "LEAGUE") as TournamentType;
        const defaultMatchesPerPlayer = Number(formData.get("defaultMatchesPerPlayer") ?? 3);

        if (!title) return;

        await createTournament({
          title,
          gameName,
          type,
          defaultMatchesPerPlayer: type === "LEAGUE" ? defaultMatchesPerPlayer : 1,
        });
      }}
      className="mt-5 space-y-4 text-xs"
    >
      <div>
        <label className="mb-1 block font-bold text-slate-300">اسم البطولة:</label>
        <input
          name="title"
          placeholder="مثال: كأس الصالة للمحترفين / دوري الأبطال"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
          required
        />
      </div>

      <div>
        <label className="mb-1 block font-bold text-slate-300">اسم اللعبة:</label>
        <input
          name="gameName"
          defaultValue="FC 26"
          placeholder="FC 26 / PES / Tekken / Mortal Kombat"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
          required
        />
      </div>

      <div>
        <label className="mb-1 block font-bold text-slate-300">نظام البطولة:</label>
        <select
          name="type"
          value={tournamentType}
          onChange={(e) => setTournamentType(e.target.value as TournamentType)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-bold"
        >
          <option value="LEAGUE">دوري عام + أدوار إقصائية للمتأهلين (League)</option>
          <option value="KNOCKOUT">كأس خروج مغلوب مباشر (Knockout Cup)</option>
        </select>
      </div>

      {/* يظهر حقل عدد المباريات فقط إذا كان النظام دوري */}
      {tournamentType === "LEAGUE" && (
        <div className="rounded-2xl bg-slate-950/70 p-3.5 border border-sky-500/30 space-y-1 animate-in fade-in duration-150">
          <label className="block text-slate-300 font-bold">
            العدد الافتراضي لمباريات كل لاعب في الدوري:
          </label>
          <input
            name="defaultMatchesPerPlayer"
            type="number"
            defaultValue={3}
            min={1}
            max={20}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-emerald-300 font-bold font-mono outline-none focus:border-emerald-400"
          />
          <span className="text-[10px] text-slate-400 block">
            (يمكنك تخصيص عدد مباريات مختلف لكل لاعب عند إضافته)
          </span>
        </div>
      )}

      {tournamentType === "KNOCKOUT" && (
        <div className="rounded-2xl bg-slate-950/70 p-3 border border-amber-500/30 text-amber-200 text-xs animate-in fade-in duration-150">
          ℹ️ <strong>نظام الكأس:</strong> ستتم القرعة العشوائية بين اللاعبين، والمغلوب يُستبعد مباشرة بينما يُجرى سحب قرعة جديدة للفائزين في كل دور حتى النهائي ومباراة المركز الثالث.
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 py-3 text-xs font-black text-slate-950 hover:brightness-110 transition shadow-lg shadow-sky-950/20"
      >
        + إنشاء البطولة وبدء اختيار اللاعبين
      </button>
    </form>
  );
}