const PAYPAL='rotationtv1@gmail.com';
const $app=document.getElementById('app');
const wallet=JSON.parse(localStorage.getItem('rotationWallet')||'{"stars":0,"beans":0,"bag":[]}');
function save(){localStorage.setItem('rotationWallet',JSON.stringify(wallet));}
function paypal(amount,item){return 'https://www.paypal.com/donate/?business='+encodeURIComponent(PAYPAL)+'&currency_code=USD&amount='+encodeURIComponent(Number(amount).toFixed(2))+'&item_name='+encodeURIComponent(item);}
function foot(){return `<nav class="foot"><a href="llm.html">LLM</a><a href="live.html">Live</a><a href="#wallet">Wallet</a><a href="README.md">Docs</a></nav>`;}
function live(){
  $app.innerHTML=`<div class="stage"></div><div class="hud"><b>I-RIS</b> first-party room<br><span class="hint">✦ ${wallet.stars} · beans ${wallet.beans}</span><p><button class="follow" id="gift">Send Signal Spark</button> <a class="btn" href="${paypal(0.99,'Rotation Studio stars 39')}" target="_blank">Top up $0.99</a></p><p class="hint">PayPal caller ID ${PAYPAL}. No third-party live ingest.</p></div>${foot()}`;
  document.getElementById('gift').onclick=()=>{
    if(wallet.stars<1){wallet.stars+=39;}
    else {wallet.stars-=1;wallet.beans+=1;wallet.bag.push('Signal Spark');}
    save(); live();
  };
}
live();
