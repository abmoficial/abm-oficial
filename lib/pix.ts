function tlv(id:string,v:string){if(v.length>99)throw Error('Campo PIX longo');return id+String(v.length).padStart(2,'0')+v}
function ascii(s:string,n:number){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,'').trim().slice(0,n)}
function crc(s:string){let c=0xffff;for(let i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(let j=0;j<8;j++)c=(c&0x8000)?((c<<1)^0x1021)&0xffff:(c<<1)&0xffff}return c.toString(16).toUpperCase().padStart(4,'0')}
function normalizePixKey(raw:string){
  const value=raw.trim();
  // Chaves de telefone celular brasileiras podem ser informadas com DDD e 9 dígitos.
  // O padrão BR Code exige o código do país: +55 + DDD + número.
  if (/^\\d{11}$/.test(value)) return '+55'+value;
  if (/^55\\d{11}$/.test(value)) return '+'+value;
  return value;
}
export function makePix(cents:number,txid:string){const rawKey=process.env.PIX_KEY?.trim(),key=rawKey?normalizePixKey(rawKey):'',name=process.env.PIX_RECEIVER_NAME?.trim(),city=process.env.PIX_RECEIVER_CITY||'BRASILIA';if(!key||!name)throw Error('PIX não configurado: informe PIX_KEY e PIX_RECEIVER_NAME no .env');if(!Number.isInteger(cents)||cents<100||cents>100000000)throw Error('Valor inválido');const acc=tlv('00','BR.GOV.BCB.PIX')+tlv('01',key);const payload=tlv('00','01')+tlv('01','11')+tlv('26',acc)+tlv('52','0000')+tlv('53','986')+tlv('54',(cents/100).toFixed(2))+tlv('58','BR')+tlv('59',ascii(name,25))+tlv('60',ascii(city,15))+tlv('62',tlv('05',txid.slice(0,25)))+'6304';return payload+crc(payload)}
