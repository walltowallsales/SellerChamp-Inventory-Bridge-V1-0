'use strict';
const express=require('express'); const path=require('path');
const app=express(); const PORT=process.env.PORT||3000; const TOKEN=process.env.SELLERCHAMP_TOKEN||''; const APP_PIN=process.env.APP_PIN||''; const SC='https://app.sellerchamp.com';
app.use(express.json({limit:'500kb'})); app.use(express.static(path.join(__dirname,'public')));
function guard(req,res,next){if(!TOKEN)return res.status(503).json({error:'SELLERCHAMP_TOKEN is not configured on the server.'});if(APP_PIN&&(req.get('x-app-pin')||'')!==APP_PIN)return res.status(401).json({error:'Incorrect app PIN.'});next()} app.use('/api',guard);
async function scFetch(ep,opt={}){const r=await fetch(SC+ep,{...opt,headers:{Token:TOKEN,'Content-Type':'application/json',...(opt.headers||{})}});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={raw:t}}if(!r.ok){const e=new Error(`SellerChamp returned ${r.status}`);e.status=r.status;e.data=d;throw e}return d}
function n(v){return Number(v||0)}
async function productByCode(code){const q=encodeURIComponent(code);const eps=[`/api/products.json?sku=${q}&page=1&page_size=50`,`/api/products.json?catalog_sku=${q}&page=1&page_size=50`,`/api/products.json?upc=${q}&page=1&page_size=50`];for(const ep of eps){try{const d=await scFetch(ep),a=d.products||[];if(a.length){const lc=String(code).toLowerCase();const p=a.find(x=>[x.sku,x.custom_catalogue_sku,x.catalog_sku,x.upc].some(v=>String(v||'').toLowerCase()===lc))||a[0];let locations=[];try{const ld=await scFetch(`/api/products/${encodeURIComponent(p.id)}/inventory_locations`);locations=ld.inventory_locations||[]}catch{}return{id:p.id,sku:p.sku||'',catalogue_sku:p.custom_catalogue_sku||p.catalog_sku||'',upc:p.upc||'',title:p.title||'',image:p.product_images?.[0]?.large_image_url||'',quantity_available:n(p.quantity_available),locations:locations.map(x=>({location:x.location||'',quantity_available:n(x.quantity_available)}))}}}catch(e){if(![400,404,422].includes(e.status))throw e}}return null}
async function activeBatches(){const d=await scFetch('/api/master_product_batches?status=active&sort=updated_at&direction=desc&page=1&page_size=250');return d.master_product_batches||[]}
async function batchDetail(id){const d=await scFetch(`/api/master_product_batches/${encodeURIComponent(id)}`);return d.master_product_batch||d}
function lineCode(x){return String(x.catalogue_sku||x.sku||x.upc||'').trim()}
function isUnsubmitted(x){const pending=n(x.quantity_pending);return pending>0 || (!x.quantity_received && n(x.quantity)>0)}
async function findBatchLines(code){const wanted=String(code).trim().toLowerCase(),batches=await activeBatches(),hits=[];for(const b0 of batches){let b;try{b=await batchDetail(b0.id)}catch{continue}for(const x of (b.lines||[])){const vals=[x.catalogue_sku,x.sku,x.upc].map(v=>String(v||'').trim().toLowerCase());if(vals.includes(wanted)&&isUnsubmitted(x))hits.push({batch_id:b.id,batch_name:b.name||b0.name||String(b.id),line_id:x.id,sku:lineCode(x),title:x.title||'',image:x.primary_image||'',location:x.location||'',quantity:n(x.quantity_pending)>0?n(x.quantity_pending):n(x.quantity),quantity_total:n(x.quantity),quantity_received:n(x.quantity_received),quantity_pending:n(x.quantity_pending)})}}return hits}
function combine(code,product,batchLines){const productQty=product?n(product.quantity_available):0;const batchQty=batchLines.reduce((s,x)=>s+n(x.quantity),0);const locMap=new Map();for(const l of (product?.locations||[])){if(n(l.quantity_available)>0)locMap.set(l.location,(locMap.get(l.location)||0)+n(l.quantity_available))}for(const x of batchLines){if(x.location)locMap.set(x.location,(locMap.get(x.location)||0)+n(x.quantity))}return{code,product,batch_lines:batchLines,effective_quantity:productQty+batchQty,product_quantity:productQty,batch_quantity:batchQty,effective_locations:[...locMap].map(([location,quantity])=>({location,quantity})),status:batchQty>0?(productQty>0?'Product + unsubmitted batch':'Waiting for submission'):'Product inventory only'}}
app.get('/api/status',async(req,res)=>{try{await scFetch('/api/marketplace_accounts');res.json({ok:true,version:'1.2.0',pinRequired:!!APP_PIN})}catch(e){res.status(e.status||500).json({error:'Could not connect to SellerChamp.',details:e.data||e.message})}});
app.get('/api/inventory/:code',async(req,res)=>{try{const code=req.params.code.trim();const [product,batchLines]=await Promise.all([productByCode(code),findBatchLines(code)]);if(!product&&!batchLines.length)return res.status(404).json({error:'SKU was not found in Products or active unsubmitted batches.'});res.json({inventory:combine(code,product,batchLines)})}catch(e){res.status(e.status||500).json({error:'Combined inventory lookup failed.',details:e.data||e.message})}});
app.get('/api/batches',async(req,res)=>{try{res.json({batches:await activeBatches()})}catch(e){res.status(e.status||500).json({error:'Could not load SellerChamp batches.',details:e.data||e.message})}});

function deepMatches(obj,wanted,path='',out=[]){
  if(out.length>=80||obj==null)return out;
  if(Array.isArray(obj)){obj.forEach((v,i)=>deepMatches(v,wanted,`${path}[${i}]`,out));return out}
  if(typeof obj==='object'){
    const flat=Object.entries(obj).filter(([,v])=>['string','number'].includes(typeof v));
    if(flat.some(([,v])=>String(v).trim().toLowerCase()===wanted)){
      const pick={}; for(const [k,v] of flat){if(/sku|catalog|upc|title|name|location|qty|quantity|status|submitted|id/i.test(k))pick[k]=v}
      out.push({path:path||'root',fields:pick});
    }
    for(const [k,v] of Object.entries(obj))deepMatches(v,wanted,path?`${path}.${k}`:k,out);
  }
  return out;
}
async function probeEndpoint(ep,code){
  try{const d=await scFetch(ep);const matches=deepMatches(d,String(code).trim().toLowerCase());return{endpoint:ep,ok:true,matches,top_level:Array.isArray(d)?'array':Object.keys(d||{}).slice(0,15)}}
  catch(e){return{endpoint:ep,ok:false,http_status:e.status||500,error:e.data||e.message}}
}
app.get('/api/diagnostic/:code',async(req,res)=>{
  const code=req.params.code.trim(),q=encodeURIComponent(code);
  const endpoints=[
    `/api/master_product_batches?status=active&sort=updated_at&direction=desc&page=1&page_size=250`,
    `/api/master_product_batches?page=1&page_size=250`,
    `/api/batches.json?query=${q}&page=1&page_size=250`,
    `/api/batches.json?page=1&page_size=250`,
    `/api/batches?query=${q}&page=1&page_size=250`,
    `/api/batches?page=1&page_size=250`,
    `/api/batch_items.json?query=${q}&page=1&page_size=250`,
    `/api/batch_items?query=${q}&page=1&page_size=250`
  ];
  try{
    const probes=[]; for(const ep of endpoints)probes.push(await probeEndpoint(ep,code));
    // Also inspect details for master batches, which may hide line data from the index.
    let master_details=[];
    try{const bs=await activeBatches();for(const b of bs.slice(0,250)){try{const d=await batchDetail(b.id);const m=deepMatches(d,String(code).toLowerCase());if(m.length)master_details.push({batch_id:b.id,batch_name:b.name||'',matches:m})}catch{}}}catch{}
    res.json({version:'1.2.0',code,read_only:true,probes,master_details});
  }catch(e){res.status(500).json({error:'Diagnostic failed.',details:e.message})}
});
app.listen(PORT,()=>console.log(`SellerChamp Inventory Bridge v1.2.0 on ${PORT}`));
