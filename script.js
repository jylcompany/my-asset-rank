(() => {
  'use strict';

  // 2025 Household Finance and Welfare Survey (단위: 만원)
  const DATA = {
    year: 2025,
    date: '2025-03-31',
    avg: 47143.703237,
    median: 23860,
    under300m: 57.0,
    over1b: 11.8,
    cutoffs: [
      [10, 1210], [20, 5108], [30, 10296], [40, 16472], [50, 23860],
      [60, 33050], [70, 46180], [80, 69380], [90, 110020]
    ],
    ages: [
      { min: 18, max: 29, label: '29세 이하', avg: 10796.376718, median: 5000 },
      { min: 30, max: 39, label: '30~39세', avg: 25059.672182, median: 15585 },
      { min: 40, max: 49, label: '40~49세', avg: 48389.228758, median: 28384 },
      { min: 50, max: 59, label: '50~59세', avg: 55161.042408, median: 31685 },
      { min: 60, max: 100, label: '60세 이상', avg: 53591.29117, median: 25000 }
    ]
  };

  const $ = id => document.getElementById(id);
  const form = $('rankForm');
  const ageInput = $('age');
  const netInput = $('netWorth');
  const resultSection = $('resultSection');
  const formError = $('formError');

  function parseWon10k(value) {
    const normalized = String(value ?? '').replace(/,/g, '').replace(/\s/g, '');
    if (!normalized) return NaN;
    return Number(normalized);
  }

  function formatManwon(v) {
    const n = Math.round(v);
    if (!Number.isFinite(n)) return '-';
    const sign = n < 0 ? '-' : '';
    const a = Math.abs(n);
    if (a < 10000) return `${sign}${a.toLocaleString('ko-KR')}만원`;
    const eok = Math.floor(a / 10000);
    const rest = a % 10000;
    if (!rest) return `${sign}${eok.toLocaleString('ko-KR')}억원`;
    return `${sign}${eok.toLocaleString('ko-KR')}억 ${rest.toLocaleString('ko-KR')}만원`;
  }

  function formatRatio(v) {
    return `${v.toLocaleString('ko-KR', {maximumFractionDigits: 1})}배`;
  }

  function getAgeGroup(age) {
    return DATA.ages.find(x => age >= x.min && age <= x.max) || DATA.ages[DATA.ages.length - 1];
  }

  function interpolatePercentile(net) {
    const c = DATA.cutoffs;
    if (net < c[0][1]) return { mode: 'below', percentile: null, top: null, bracket: 'P10 미만' };
    if (net > c[c.length - 1][1]) return { mode: 'above', percentile: null, top: null, bracket: 'P90 초과' };
    for (let i = 0; i < c.length - 1; i++) {
      const [p1, v1] = c[i], [p2, v2] = c[i + 1];
      if (net >= v1 && net <= v2) {
        const p = p1 + (net - v1) / (v2 - v1) * (p2 - p1);
        return { mode: 'exact', percentile: p, top: 100 - p, lower: [p1, v1], upper: [p2, v2] };
      }
    }
    return { mode: 'above', percentile: null, top: null, bracket: 'P90 초과' };
  }

  function rankText(rank) {
    if (rank.mode === 'below') return { title: '하위 10% 구간', score: '하위 10% 구간', badge: 'P10↓' };
    if (rank.mode === 'above') return { title: '대한민국 상위 10% 이내', score: '상위 10% 이내', badge: 'P90↑' };
    const top = Math.max(0.1, rank.top);
    return { title: `대한민국 상위 ${top < 1 ? top.toFixed(1) : top.toFixed(1)}%`, score: `상위 ${top.toFixed(1)}%`, badge: `P${Math.round(rank.percentile)}` };
  }

  function meterPosition(rank) {
    if (rank.mode === 'below') return 5;
    if (rank.mode === 'above') return 95;
    return Math.max(2, Math.min(98, rank.percentile));
  }

  function updateUrl(age, net) {
    const url = new URL(window.location.href);
    url.searchParams.set('age', String(age));
    url.searchParams.set('net', String(Math.round(net)));
    history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
    return url.toString();
  }

  function updateMeta(rank) {
    const rt = rankText(rank);
    document.title = `${rt.title} | 내자산순위`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = `내 가구 순자산은 대한민국 ${rt.score}. 2025 가계금융복지조사 기준 참고용 계산 결과입니다.`;
  }

  function render(age, net, {scroll = true} = {}) {
    const rank = interpolatePercentile(net);
    const rt = rankText(rank);
    const ageGroup = getAgeGroup(age);

    $('resultTitle').textContent = rt.title;
    $('resultSub').textContent = rank.mode === 'exact'
      ? '공식 P10~P90 경계값 사이를 보간한 참고용 추정치입니다.'
      : '공개된 공식 경계값만으로 정확한 백분위를 산출할 수 없는 구간입니다.';
    $('scoreText').textContent = rt.score;
    $('scoreBadge').textContent = rt.badge;
    $('myNet').textContent = formatManwon(net);
    $('nationalAvg').textContent = formatManwon(DATA.avg);
    $('nationalMedian').textContent = formatManwon(DATA.median);

    const pos = meterPosition(rank);
    $('meterFill').style.width = `${pos}%`;
    $('meterDot').style.left = `${pos}%`;

    $('ageHeading').textContent = `${ageGroup.label} 가구주 평균`;
    $('ageAverage').textContent = formatManwon(ageGroup.avg);
    $('ageMedian').textContent = formatManwon(ageGroup.median);
    const ratio = net / ageGroup.avg;
    $('ageRatio').textContent = Number.isFinite(ratio) ? `평균의 ${formatRatio(ratio)}` : '-';
    if (net >= ageGroup.avg) {
      $('ageCompare').textContent = `해당 연령대 평균보다 ${formatManwon(net - ageGroup.avg)} 많습니다.`;
    } else {
      $('ageCompare').textContent = `해당 연령대 평균보다 ${formatManwon(ageGroup.avg - net)} 적습니다.`;
    }

    if (rank.mode === 'below') {
      $('bracketText').innerHTML = `입력하신 순자산 <strong>${formatManwon(net)}</strong>은 공식 P10 경계값 <strong>${formatManwon(DATA.cutoffs[0][1])}</strong>보다 낮습니다. 이 구간의 세부 백분위는 공개된 경계값만으로 계산하지 않았습니다.`;
    } else if (rank.mode === 'above') {
      $('bracketText').innerHTML = `입력하신 순자산 <strong>${formatManwon(net)}</strong>은 공식 P90 경계값 <strong>${formatManwon(DATA.cutoffs.at(-1)[1])}</strong>보다 높습니다. 따라서 <strong>상위 10% 이내</strong>로 표시합니다.`;
    } else {
      $('bracketText').innerHTML = `<strong>P${rank.lower[0]}(${formatManwon(rank.lower[1])})</strong>와 <strong>P${rank.upper[0]}(${formatManwon(rank.upper[1])})</strong> 사이에서 선형 보간했습니다. 계산상 백분위는 <strong>P${rank.percentile.toFixed(1)}</strong>, 상위 비율은 <strong>${rank.top.toFixed(1)}%</strong>입니다.`;
    }

    $('cutoffRow').innerHTML = DATA.cutoffs.map(([p, v]) => `<div class="cutoff ${rank.mode === 'exact' && Math.round(rank.percentile) === p ? 'active' : ''}"><b>P${p}</b><span>${formatManwon(v)}</span></div>`).join('');

    updateMeta(rank);
    const shareUrl = updateUrl(age, net);
    resultSection.classList.remove('hidden');
    if (scroll) resultSection.scrollIntoView({behavior:'smooth', block:'start'});
    return { rank, ageGroup, shareUrl };
  }

  function getInputs() {
    const age = Number(ageInput.value);
    const net = parseWon10k(netInput.value);
    if (!Number.isInteger(age) || age < 18 || age > 100) throw new Error('가구주 나이는 18~100세 사이로 입력해주세요.');
    if (!Number.isFinite(net)) throw new Error('순자산을 입력해주세요.');
    if (Math.abs(net) > 100000000) throw new Error('순자산은 만원 단위로 입력해주세요.');
    return { age, net };
  }

  function calculate(scroll = true) {
    formError.textContent = '';
    try {
      const {age, net} = getInputs();
      return render(age, net, {scroll});
    } catch (e) {
      formError.textContent = e.message;
      return null;
    }
  }

  async function shareResult() {
    try {
      const {age, net} = getInputs();
      const {rank, shareUrl} = render(age, net, {scroll:false});
      const rt = rankText(rank);
      const text = `나는 ${rt.score}래요 😮\n나도 대한민국 자산 순위 확인해보기`;
      if (navigator.share) {
        await navigator.share({title: '내자산순위', text, url: shareUrl});
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      alert('결과 링크를 복사했어요. 원하는 곳에 붙여넣어 공유하세요.');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      try {
        const url = new URL(window.location.href).toString();
        const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        alert('결과 링크를 복사했어요.');
      } catch (_) { alert('공유 링크 복사에 실패했습니다. 주소창의 링크를 복사해주세요.'); }
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); calculate(true); });
  $('shareBtn').addEventListener('click', shareResult);
  $('shareBtnBottom').addEventListener('click', shareResult);
  $('againBtn').addEventListener('click', () => { resultSection.classList.add('hidden'); window.scrollTo({top:0,behavior:'smooth'}); ageInput.focus(); });

  const dialog = $('infoDialog');
  $('howBtn').addEventListener('click', () => dialog.showModal());
  $('detailsBtn').addEventListener('click', () => dialog.showModal());
  $('closeDialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  // Shared links: ?age=38&net=50000 automatically restore the result.
  const params = new URLSearchParams(location.search);
  const sharedAge = Number(params.get('age'));
  const sharedNet = parseWon10k(params.get('net'));
  if (Number.isInteger(sharedAge) && Number.isFinite(sharedNet) && sharedAge >= 18 && sharedAge <= 100) {
    ageInput.value = sharedAge;
    netInput.value = Math.round(sharedNet).toLocaleString('ko-KR');
    render(sharedAge, sharedNet, {scroll:false});
  }
})();
