import { strict as assert } from "node:assert";
import { websiteUrl, publicIPv4, parsePage, readPage, robotsAllows, validateExtraction, extractedFields, extractBusiness } from "./website.ts";
const html=`<html><head><title>Maison Test</title><meta name="description" content="Maison Test propose des outils pour les artisans."/></head><body><h1>Maison Test</h1><p>Notre outil simplifie la préparation des devis pour les artisans et fait gagner du temps.</p><a href="/products/devis">Devis facile</a><a href="http://127.0.0.1/secret">Ignore this</a><script>sendSecrets()</script></body></html>`;
const page=parsePage(html,"https://vendor.fr/");
const missing=():Record<string, {value:string|null;evidence:string|null;source_url:string|null;kind:string}>=>Object.fromEntries(extractedFields.map(k=>[k,{value:null,evidence:null,source_url:null,kind:"missing"}]));
Deno.test("Website URLs and pinned IP rules reject internal networks and alternate encodings",()=>{
 for(const url of ["file:///etc/passwd","http://127.1/","http://2130706433/","http://0x7f000001/","https://[::1]/","https://user:password@vendor.fr/","https://localhost/","https://vendor.local/","https://vendor.fr:8443/"])assert.throws(()=>websiteUrl(url));
 for(const ip of ["127.0.0.1","10.0.0.1","169.254.169.254","172.16.0.1","192.168.0.1","100.64.0.1","198.18.0.1","224.0.0.1","::ffff:127.0.0.1"])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4("93.184.216.34"),true);
 assert.equal(websiteUrl("https://vendor.fr/vente#offre").href,"https://vendor.fr/vente");
});
Deno.test("HTML extraction removes executable content and limits links to public same-origin offers",()=>{
 assert.match(page.text,/préparation des devis/);assert.doesNotMatch(page.text,/sendSecrets/);
 assert.deepEqual(page.links,["https://vendor.fr/products/devis"]);
});
Deno.test("Robots denial prevents fetching the page; inaccessible pages never become business facts",async()=>{
 assert.equal(robotsAllows("User-agent: *\nDisallow: /private\nAllow: /private/public","/private/x"),false);
 assert.equal(robotsAllows("User-agent: *\nDisallow: /private\nAllow: /private/public","/private/public"),true);
 const calls:string[]=[];
 await assert.rejects(()=>readPage("https://vendor.fr/",async url=>{calls.push(url);return{url,status:200,type:"text/plain",body:"User-agent: *\nDisallow: /"};}));
 assert.deepEqual(calls,["https://vendor.fr/robots.txt"]);
 const found=await readPage("https://vendor.fr/",async url=>({url,status:url.endsWith('robots.txt')?404:200,type:'text/html',body:html}));
 assert.equal(found.url,"https://vendor.fr/");
});
Deno.test("Structured results require exact source evidence and never include a fabricated price",async()=>{
 const result=missing();result.name={value:"Maison Test",evidence:"Maison Test",source_url:page.url,kind:"extracted"};
 assert.equal(validateExtraction(result,[page]).name.value,"Maison Test");
 assert.throws(()=>validateExtraction({...result,price:"50"},[page]));
 assert.throws(()=>validateExtraction({...result,name:{...result.name,evidence:"Citation inventée"}},[page]));
 assert.throws(()=>validateExtraction({...result,name:{...result.name,source_url:"https://other.fr/"}},[page]));
 let request:any;
 const send=(async (_url:any,options:any)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(result)}]}]}));}) as typeof fetch;
 const extracted=await extractBusiness([page],"fixture-key","fixture-model",send);
 assert.equal(extracted.name.value,"Maison Test");assert.equal(request.store,false);assert.equal(request.text.format.strict,true);assert.equal(request.text.format.schema.properties.price,undefined);
 await assert.rejects(()=>extractBusiness([page],"key","model",(async()=>new Response("",{status:429})) as typeof fetch));
});
