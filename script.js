const $ = (id) => document.getElementById(id);

const data = {
  // 2025 가계금융복지조사 (2025-03-31 기준) 공식 공표 순자산 분위 경계값.
  // 단위: 만원.
  // P50 = 중앙값, P60 = 상위 40% 진입선, ... P90 = 상위 10% 진입선.
  officialCutoffs: [
    { percentile: 50, manwon: 23860 },
    { percentile: 60, manwon: 33050 },
    { percentile: 70, manwon: 46180 },
    { percentile: 80, manwon: 69380 },
    { percentile: 90, manwon: 110020 }
  ],
  official: {
    averageManwon: 47144,
    under300mPct: 57.0,
    over1bPct: 11.8
  },
  ageAverage: [
    { min: 19, max: 29, label: "20대 가구주 평균", manwon: 10796 },
    { min: 30, max: 39, label: "30대 가구주 평균", manwon: 25060 },
    { min: 40, max: 49, label: "40대 가구주 평균", manwon: 48389 },
    { min: 50, max: 59, label: "50대 가구주 평균", manwon: 55161 },
    { min: 60, max: 100, label: "60세 이상 가구주 평균", manwon: 53591 }
  ]
};

function money(won) {
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000);
    const man = Math.round((won % 100000000) / 10000);
    return man ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${Math.round(won / 10000).toLocaleString()}만원`;
}

function interpolatePercentile(manwon) {
  const c = data.officialCutoffs;

  // Below P50: exact 2025 P10-P40 cutoffs are not reproduced here.
  // We use a conservative piecewise estimate and explicitly label the
  // result as an estimate below the official P50 boundary.
  if (manwon < c[0].manwon) {
    // A simple monotone bridge to P50. This is NOT presented as an official
    // P10-P40 cutoff; it is only for a usable MVP.
    const ratio = Math.max(0, Math.min(1, manwon / c[0].manwon));
    return 100 - 50 * Math.pow(ratio, 0.72);
  }

  // Official P50-P90 boundaries. Interpolate in log-money space.
  for (let i = 0; i < c.length - 1; i++) {
    const a = c[i];
    const b = c[i + 1];
    if (manwon >= a.manwon && manwon <= b.manwon) {
      const x = (Math.log(manwon) - Math.log(a.manwon)) /
                (Math.log(b.manwon) - Math.log(a.manwon));
      return a.percentile + (b.percentile - a.percentile) * x;
    }
  }

  // Above P90: 2025 official publication states that 10억원 이상 가구는
  // 11.8%. P90 is 11억 20만원, so 10억 is slightly below P90.
  // For the open-ended upper tail, estimate smoothly beyond P90.
  const last = c[c.length - 1];
  const ratio = Math.max(1, manwon / last.manwon);
  return Math.max(0.01, 90 + (0.0 - 90) * Math.exp(-1.25 * Math.log(ratio)));
}

function isOfficialRange(manwon) {
  return manwon >= data.officialCutoffs[0].manwon;
}

function getAgeAverage(age) {
  return data.ageAverage.find(x => age >= x.min && age <= x.max) || data.ageAverage[2];
}

function calculate() {
  const age = Number($("age").value);
  const man = Number($("netWorth").value);
  if (!age || age < 19 || age > 100) return alert("나이는 19~100세로 입력해주세요.");
  if (Number.isNaN(man) || man < 0) return alert("순자산을 입력해주세요.");

  const won = man * 10000;
  const top = Math.max(0.01, Math.min(99.9, interpolatePercentile(man)));
  const ageData = getAgeAverage(age);
  const officialRange = isOfficialRange(man);

  $("percentile").textContent = `상위 ${top < 1 ? top.toFixed(2) : top.toFixed(1)}%`;
  $("rankText").textContent = officialRange
    ? `2025년 공식 P50~P90 경계값을 기준으로 계산한 참고 순위입니다.`
    : `현재 공식 자료에서 직접 확인 가능한 P50 미만 구간이 없어 참고용 추정치입니다.`;
  $("worthText").textContent = money(won);
  $("barFill").style.width = `${Math.max(3, Math.min(99, 100 - top))}%`;
  $("barCaption").textContent = `상위 ${top < 1 ? top.toFixed(2) : top.toFixed(1)}%`;
  $("ageLabel").textContent = ageData.label;
  $("ageAvg").textContent = `${money(ageData.manwon * 10000)}`;

  $("result").classList.remove("hidden");
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function shareResult() {
  const text = `나 대한민국 상위 ${$("percentile").textContent.replace("상위 ", "")}래. 너는 몇 %?`;
  if (navigator.share) {
    try { await navigator.share({ title: "나 대한민국 상위 몇 %?", text, url: location.href }); }
    catch (e) {}
  } else {
    try {
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      alert("결과 공유 문구가 복사됐습니다!");
    } catch (e) {
      alert("공유 링크를 복사하지 못했습니다.");
    }
  }
}

$("calculateBtn").addEventListener("click", calculate);
$("shareBtn").addEventListener("click", shareResult);
$("resetBtn").addEventListener("click", () => {
  $("result").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});
$("howBtn").addEventListener("click", () => $("criteria").showModal());
$("closeDialog").addEventListener("click", () => $("criteria").close());

$("netWorth").addEventListener("keydown", e => { if (e.key === "Enter") calculate(); });
$("age").addEventListener("keydown", e => { if (e.key === "Enter") $("netWorth").focus(); });
