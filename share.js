(()=>{
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'');

  function buildShareUrl(){
    const u=new URL(location.href);
    u.search='';
    u.hash='';
    const mode=$('compatPanel')&&!$('compatPanel').classList.contains('hidden')?'compat':'saju';
    u.searchParams.set('mode',mode);
    if(mode==='saju'){
      u.searchParams.set('n',clean($('name')?.value).trim());
      u.searchParams.set('b',clean($('birth')?.value).replace(/\D/g,''));
      u.searchParams.set('h',clean($('birthHour')?.value));
      u.searchParams.set('g',clean($('gender')?.value));
      u.searchParams.set('m',clean($('marital')?.value));
    }else{
      u.searchParams.set('a',clean($('aBirth')?.value).replace(/\D/g,''));
      u.searchParams.set('ah',clean($('aHour')?.value));
      u.searchParams.set('ag',clean($('aGender')?.value));
      u.searchParams.set('b',clean($('bBirth')?.value).replace(/\D/g,''));
      u.searchParams.set('bh',clean($('bHour')?.value));
      u.searchParams.set('bg',clean($('bGender')?.value));
    }
    return u.href;
  }

  async function shareResult(){
    const url=buildShareUrl();
    try{
      if(navigator.share){
        await navigator.share({title:'사주명장 결과',text:'사주명장에서 확인한 결과를 공유합니다.',url});
      }else if(navigator.clipboard){
        await navigator.clipboard.writeText(url);
        alert('결과 링크를 복사했습니다. 상대방이 링크를 열면 같은 결과를 볼 수 있습니다.');
      }else{
        window.prompt('아래 링크를 복사해주세요.',url);
      }
    }catch(e){
      if(e?.name!=='AbortError'&&navigator.clipboard){
        try{await navigator.clipboard.writeText(url);alert('결과 링크를 복사했습니다.');}catch(_){ }
      }
    }
  }

  function replaceButton(id){
    const old=$(id); if(!old)return null;
    const fresh=old.cloneNode(true); old.replaceWith(fresh); return fresh;
  }

  function loadSharedResult(){
    const q=new URLSearchParams(location.search),mode=q.get('mode');
    if(!mode)return;
    if(mode==='saju'&&q.get('b')){
      if($('name'))$('name').value=q.get('n')||'';
      if($('birth'))$('birth').value=formatBirthForShare(q.get('b'));
      if($('birthHour'))$('birthHour').value=q.get('h')||'';
      if($('gender'))$('gender').value=q.get('g')||'male';
      if($('marital'))$('marital').value=q.get('m')||'single';
      tabs('saju');
      renderSaju();
    }else if(mode==='compat'&&q.get('a')&&q.get('b')){
      if($('aBirth'))$('aBirth').value=formatBirthForShare(q.get('a'));
      if($('aHour'))$('aHour').value=q.get('ah')||'';
      if($('aGender'))$('aGender').value=q.get('ag')||'male';
      if($('bBirth'))$('bBirth').value=formatBirthForShare(q.get('b'));
      if($('bHour'))$('bHour').value=q.get('bh')||'';
      if($('bGender'))$('bGender').value=q.get('bg')||'female';
      tabs('compat');
      renderCompat();
    }
  }

  function formatBirthForShare(v){
    const d=clean(v).replace(/\D/g,'').slice(0,8);
    if(d.length===8)return d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6);
    return d;
  }

  function init(){
    const b1=replaceButton('shareBtn');
    const b2=replaceButton('shareBottom');
    if(b1)b1.addEventListener('click',shareResult);
    if(b2)b2.addEventListener('click',shareResult);
    loadSharedResult();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
