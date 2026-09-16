const $=id=>document.getElementById(id);let pin=localStorage.getItem('scPin')||'';
async function api(url,opt={}){const r=await fetch(url,{...opt,headers:{'Content-Type':'application/json','x-app-pin':pin,...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error+(d.details?' · '+JSON.stringify(d.details):''));return d}
function toast(s,bad=false){$('toast').textContent=s;$('toast').className='toast '+(bad?'bad':'good');setTimeout(()=>$('toast').classList.add('hidden'),4500)}
async function status(){try{await api('/api/status');$('connection').textContent='Connected';$('connection').className='status good';$('pinCard').classList.add('hidden')}catch(e){$('connection').textContent='Locked / Offline';$('connection').className='status bad';$('pinCard').classList.remove('hidden')}}
$('savePin').onclick=()=>{pin=$('pin').value.trim();localStorage.setItem('scPin',pin);status()};
$('searchBtn').onclick=search;$('sku').addEventListener('keydown',e=>{if(e.key==='Enter')search()});
async function search(){const code=$('sku').value.trim();if(!code)return toast('Enter an SKU.',true);$('searchBtn').disabled=true;$('searchBtn').textContent='SEARCHING…';$('result').classList.add('hidden');try{const d=await api('/api/inventory/'+encodeURIComponent(code));render(d.inventory)}catch(e){toast(e.message,true)}finally{$('searchBtn').disabled=false;$('searchBtn').textContent='SEARCH'}}
function render(x){const p=x.product,bl=x.batch_lines||[],title=p?.title||bl[0]?.title||'',img=p?.image||bl[0]?.image||'';$('result').innerHTML=`<section class="card item"><div class="itemTop">${img?`<img src="${esc(img)}">`:''}<div class="grow"><div class="sku">${esc(p?.sku||x.code)}</div><h3>${esc(title)}</h3><span class="badge safe">${esc(x.status)}</span></div></div><div class="stats bigstats"><div><b>${x.effective_quantity}</b><span>EFFECTIVE QTY</span></div><div><b>${x.product_quantity}</b><span>Products</span></div><div><b>${x.batch_quantity}</b><span>Unsubmitted Batches</span></div></div><div class="productBox"><b>Effective locations</b><div class="locations">${x.effective_locations.length?x.effective_locations.map(l=>`<div><strong>${esc(l.location)}</strong> — Qty ${l.quantity}</div>`).join(''):'<div>None</div>'}</div></div>${p?`<div class="productBox"><b>Products section</b><div>Qty available: <strong>${x.product_quantity}</strong></div><div>Locations: ${p.locations?.length?p.locations.map(l=>`${esc(l.location)} (${l.quantity_available})`).join(', '):'<strong>none</strong>'}</div></div>`:''}${bl.length?`<div class="productBox"><b>Unsubmitted batch inventory</b>${bl.map(b=>`<div class="batchrow"><strong>${esc(b.batch_name)}</strong><br>Location: <strong>${esc(b.location||'—')}</strong> · Qty: <strong>${b.quantity}</strong></div>`).join('')}</div>`:''}</section>`;$('result').classList.remove('hidden')}
$('diagBtn').onclick=diagnose;
async function diagnose(){
 const code=$('sku').value.trim();if(!code)return toast('Enter an SKU first.',true);
 $('diagBtn').disabled=true;$('diagBtn').textContent='RUNNING…';$('diagnostic').classList.add('hidden');
 try{const d=await api('/api/diagnostic/'+encodeURIComponent(code));renderDiagnostic(d)}catch(e){toast(e.message,true)}finally{$('diagBtn').disabled=false;$('diagBtn').textContent='RUN BATCH DIAGNOSTIC'}
}
$('productDiagBtn').onclick=productDiagnose;
async function productDiagnose(){
 const code=$('sku').value.trim();if(!code)return toast('Enter an SKU first.',true);
 $('productDiagBtn').disabled=true;$('productDiagBtn').textContent='RUNNING…';$('diagnostic').classList.add('hidden');
 try{const d=await api('/api/product-diagnostic/'+encodeURIComponent(code));renderProductDiagnostic(d)}catch(e){toast(e.message,true)}finally{$('productDiagBtn').disabled=false;$('productDiagBtn').textContent='RUN PRODUCT RECORD DIAGNOSTIC'}
}
function renderProductDiagnostic(d){
 const p=d.product;
 const probes=(d.probes||[]).map(x=>`<div class="batchrow"><strong>${esc(x.endpoint)}</strong><br>${x.ok?`HTTP OK · records: ${x.count} · exact SKU matches: <strong>${x.exact_matches}</strong>`:`HTTP ${x.http_status||'error'} · ${esc(x.error||'Unavailable')}`}</div>`).join('');
 const related=(d.related||[]).map(x=>`<div class="batchrow"><strong>${esc(x.endpoint)}</strong><br>${x.ok?`HTTP OK${x.interesting?.length?`<details><summary>Interesting fields (${x.interesting.length})</summary><pre>${esc(JSON.stringify(x.interesting,null,2))}</pre></details>`:''}<details><summary>Returned record</summary><pre>${esc(JSON.stringify(x.data,null,2))}</pre></details>`:`HTTP ${x.http_status||'error'} · ${esc(x.error||'Unavailable')}`}</div>`).join('');
 $('diagnostic').innerHTML=`<section class="card item"><h2>Product Record Diagnostic — ${esc(d.code)}</h2><p><strong>Read-only.</strong> No SellerChamp data was changed.</p><div class="productBox"><b>Summary</b><div>Exact Product found: <strong>${p?'Yes':'No'}</strong></div>${p?`<div>Product ID: <strong>${esc(p.id)}</strong></div><div>SKU: <strong>${esc(p.sku)}</strong></div>`:''}</div>${p?`<div class="productBox"><b>Interesting fields from Product search record</b><pre>${esc(JSON.stringify(p.interesting,null,2))}</pre><details><summary>Full Product search record</summary><pre>${esc(JSON.stringify(p.raw,null,2))}</pre></details></div>`:''}<div class="productBox"><b>Product lookup probes</b>${probes}</div>${related?`<div class="productBox"><b>Related Product endpoints</b>${related}</div>`:''}</section>`;
 $('diagnostic').classList.remove('hidden');
}
function renderDiagnostic(d){
 const found=(d.probes||[]).filter(x=>x.ok&&x.matches?.length), details=d.master_details||[];
 const rows=(d.probes||[]).map(x=>`<div class="batchrow"><strong>${esc(x.endpoint)}</strong><br>${x.ok?`HTTP OK · matches: <strong>${x.matches.length}</strong>${x.matches.length?`<pre>${esc(JSON.stringify(x.matches,null,2))}</pre>`:''}`:`HTTP ${x.http_status||'error'} · ${esc(x.http_status===404?'Route not available in SellerChamp API.':(typeof x.error==='string'?x.error:'SellerChamp rejected this route.'))}`}</div>`).join('');
 $('diagnostic').innerHTML=`<section class="card item"><h2>Batch API Diagnostic — ${esc(d.code)}</h2><p><strong>Read-only.</strong> No SellerChamp data was changed.</p><div class="productBox"><b>Summary</b><div>Endpoints containing this SKU: <strong>${found.length}</strong></div><div>Master-batch detail matches: <strong>${details.length}</strong></div></div>${details.length?`<div class="productBox"><b>Master batch detail matches</b><pre>${esc(JSON.stringify(details,null,2))}</pre></div>`:''}<div class="productBox"><b>Endpoint probes</b>${rows}</div></section>`;
 $('diagnostic').classList.remove('hidden');
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}status();

$('webDiagBtn').onclick=webDiagnose;
async function webDiagnose(){
 const code=$('sku').value.trim();if(!code)return toast('Enter an SKU first.',true);
 $('webDiagBtn').disabled=true;$('webDiagBtn').textContent='RUNNING…';$('diagnostic').classList.add('hidden');
 try{const d=await api('/api/web-route-diagnostic/'+encodeURIComponent(code));renderWebDiagnostic(d)}catch(e){toast(e.message,true)}finally{$('webDiagBtn').disabled=false;$('webDiagBtn').textContent='RUN WEB ROUTE DIAGNOSTIC'}
}
function renderWebDiagnostic(d){
 const useful=(d.probes||[]).filter(x=>x.http_status>=200&&x.http_status<400);
 const rows=(d.probes||[]).map(x=>`<div class="batchrow"><strong>${esc(x.host)}${esc(x.endpoint)}</strong><br>HTTP ${x.http_status||'error'} · ${esc(x.content_type||'')}${x.json?' · JSON':''}${x.error?` · ${esc(x.error)}`:''}${x.snippet?`<details><summary>Response preview</summary><pre>${esc(x.snippet)}</pre></details>`:''}</div>`).join('');
 $('diagnostic').innerHTML=`<section class="card item"><h2>Web Route Diagnostic — ${esc(d.code)}</h2><p><strong>Read-only.</strong> This tests the SellerChamp web-app host (app2) and API host using GET requests only.</p><div class="productBox"><b>Summary</b><div>Successful/redirecting routes: <strong>${useful.length}</strong></div><div>We are looking for a response that exposes Batch #338, Qty 6, Location C0221, or a route that redirects to SellerChamp sign-in.</div></div><div class="productBox"><b>Route probes</b>${rows}</div></section>`;
 $('diagnostic').classList.remove('hidden');
}
