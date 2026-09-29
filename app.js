const state={category:'domestic',last:null};
const $=id=>document.getElementById(id);
function money(value){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(value)}
function calculate(){
  const units=Math.floor(Number($('units').value));
  if(!Number.isFinite(units)||units<0){$('error').textContent='Please enter a valid number of units.';return}
  $('error').textContent=''; let rows=[],energy=0,fixed=state.category==='commercial'?50:0;
  if(state.category==='domestic'){
    const free=Math.min(units,100); rows.push(['0–100 (Free Slab)',free,'FREE',0]);
    const u1=Math.max(0,Math.min(units,200)-100); if(u1) {rows.push(['101–200',u1,3.5,u1*3.5]);energy+=u1*3.5}
    const u2=Math.max(0,units-200); if(u2) {rows.push(['201+',u2,6.5,u2*6.5]);energy+=u2*6.5}
  }else{
    const u1=Math.min(units,100);if(u1) {rows.push(['0–100',u1,5,u1*5]);energy+=u1*5}
    const u2=Math.max(0,Math.min(units,200)-100);if(u2){rows.push(['101–200',u2,8.5,u2*8.5]);energy+=u2*8.5}
    const u3=Math.max(0,units-200);if(u3){rows.push(['201+',u3,9,u3*9]);energy+=u3*9}
  }
  const duty=(energy+fixed)*.07,total=energy+fixed+duty,savings=state.category==='domestic'?Math.min(units,100)*3.5:0;state.last={units,energy,fixed,duty,total,savings,rows};
  $('breakdown').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${typeof r[2]==='number'?money(r[2]):r[2]}</td><td>${money(r[3])}</td></tr>`).join('');$('energy').textContent=money(energy);$('fixed').textContent=money(fixed);$('duty').textContent=money(duty);$('total').textContent=money(total);$('statUnits').textContent=`${units} units`;$('statTotal').textContent=money(total);$('statSavings').textContent=money(savings)
}
document.querySelectorAll('.segment').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.segment').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.category=btn.dataset.category;calculate()}));$('calculate').addEventListener('click',calculate);$('units').addEventListener('keydown',e=>{if(e.key==='Enter')calculate()});$('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');$('themeToggle').innerHTML=document.body.classList.contains('dark')?'☀ <span>Light mode</span>':'☾ <span>Dark mode</span>'});$('download').addEventListener('click',()=>{if(!state.last)calculate();const b=state.last;const text=`TNEB CALC - BILL ESTIMATE\n\nConnection: ${state.category}\nUnits: ${b.units} kWh\nEnergy charge: ${money(b.energy)}\nFixed charge: ${money(b.fixed)}\nElectricity duty (7%): ${money(b.duty)}\nTOTAL: ${money(b.total)}\n\nThis is an estimate, not an official TANGEDCO bill.`;const blob=new Blob([text],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`tneb-estimate-${b.units}-units.txt`;a.click();URL.revokeObjectURL(url)});calculate();