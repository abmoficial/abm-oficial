import { AREAS } from '../../lib/auth';
import { createMember, updateMember, resetMemberPassword } from './team-actions';
const names: Record<string,string> = {site:'Textos do site',stories:'Histórias',impact:'Impacto',carousel:'Galeria / Vídeos',campaigns:'Projetos',presets:'Valores PIX',donations:'Doações',shop:'Lojinha'};
type Member = {id:number;email:string;role:string;active:boolean;permissions:string[]};
export default function TeamPanel({members}:{members:Member[]}) {
  const field = {padding:10,border:'1px solid #cbd5d1',borderRadius:8,maxWidth:'100%'};
  return <section style={{display:'grid',gap:24}}>
    <div style={{background:'white',padding:24,borderRadius:14}}>
      <h2>Cadastrar diretor ou staff</h2>
      <p>Diretores podem gerenciar todo o conteúdo. Staff acessa somente as áreas marcadas. Somente o administrador gerencia a equipe.</p>
      <form action={createMember} style={{display:'grid',gap:12,maxWidth:600}}>
        <input style={field} type="email" name="email" placeholder="E-mail do novo usuário" required />
        <input style={field} type="password" name="password" minLength={12} placeholder="Senha provisória (mínimo 12 caracteres)" required autoComplete="new-password" />
        <label>Função <select name="role" defaultValue="staff" style={field}><option value="staff">Staff</option><option value="director">Diretor</option></select></label>
        <fieldset style={{border:'1px solid #ddd',borderRadius:8,padding:12}}><legend>Áreas autorizadas para Staff</legend>{AREAS.map(x=><label key={x} style={{display:'block',padding:5}}><input type="checkbox" name="permissions" value={x} /> {names[x]}</label>)}</fieldset>
        <button className="btn" type="submit">Criar usuário</button>
      </form>
    </div>
    {members.map(m=><div key={m.id} style={{background:'white',padding:24,borderRadius:14}}>
      <h3>{m.email}</h3>
      <form action={updateMember} style={{display:'grid',gap:12,maxWidth:600}}>
        <input type="hidden" name="id" value={m.id}/>
        <label>Função <select name="role" defaultValue={m.role} style={field}><option value="staff">Staff</option><option value="director">Diretor</option></select></label>
        <label><input type="checkbox" name="active" defaultChecked={m.active}/> Conta ativa</label>
        <fieldset style={{border:'1px solid #ddd',borderRadius:8,padding:12}}><legend>Permissões do Staff</legend>{AREAS.map(x=><label key={x} style={{display:'block',padding:5}}><input type="checkbox" name="permissions" value={x} defaultChecked={m.permissions.includes(x)}/> {names[x]}</label>)}</fieldset>
        <button className="btn" type="submit">Salvar permissões</button>
      </form>
      <form action={resetMemberPassword} style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16}}>
        <input type="hidden" name="id" value={m.id}/>
        <input style={field} name="password" type="password" minLength={12} placeholder="Nova senha (mínimo 12 caracteres)" required autoComplete="new-password"/>
        <button className="btn" type="submit">Redefinir senha</button>
      </form>
    </div>)}
  </section>;
}
