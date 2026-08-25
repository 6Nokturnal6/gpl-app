import { Card, TableWrap, Th, Td, AddRowBtn, SectionTitle } from '../Layout/FormComponents';
import { emptyDesportoOrganizado, emptyDesportoParticipacao, emptyCulturaOrganizada, emptyCulturaParticipacao, emptyGrupo, emptyTunaAtleta, emptyEstudanteAtividade } from '../../hooks/useSubmission';

const td = { border:'0.5px solid var(--color-border-tertiary)', padding:'3px 6px' };
function inpStyle(w) { return { border:'none', background:'transparent', fontSize:12, width:w||'100%' }; }

function TableSection({ title, description, items, setItems, columns, renderRow, emptyRow }) {
  const addRow = () => setItems([...items, emptyRow()]);
  const updateRow = (i, k, v) => setItems(items.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const removeRow = (i) => setItems(items.filter((_, idx) => idx !== i));

  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      {description && <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:8}}>{description}</div>}
      <TableWrap>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <Th key={i} center={col.center}>{col.label}</Th>
            ))}
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={i}>
              {renderRow(r, i, updateRow)}
              <td style={{...td,textAlign:'center'}}>
                <button onClick={() => removeRow(i)} style={{fontSize:11,color:'var(--color-text-danger)',background:'none',border:'none',cursor:'pointer'}}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <AddRowBtn onClick={addRow} label="+ Adicionar linha" />
    </>
  );
}

function NumInput(props) {
  const { onChange, ...inputProps } = props;
  return <input type="number" min="0" {...inputProps} onChange={(e) => onChange?.(e.target.value)} style={{...inpStyle(props.style?.width||44), textAlign:'center', ...props.style}} />;
}

function TextInput({ value, onChange, placeholder, width }) {
  return <input value={value||''} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} style={{...inpStyle(width||100)}} />;
}

export default function SectionCultura({ data, update }) {
  const c = data.cultura || {};

  const updateCultura = (key, newVal) => update('cultura', { ...c, [key]: newVal });

  // Counter function
  const countTotal = (rows, hField, mField) => {
    return rows.reduce((sum, r) => sum + ((r[hField]||0) + (r[mField]||0)), 0);
  };

  return (
    <Card title="E. Desporto e Cultura" desc="Atividades desportivas e culturais realizadas pela unidade orgânica">

      {/* 1. Eventos Desportivos Organizados */}
      <TableSection
        title="1. Eventos Desportivos Organizados"
        description="Modalidade desportiva, data, local, objetivos e participantes (estudantes e docentes/CTA)"
        items={c.desportoOrganizado || []}
        setItems={(newVal) => updateCultura('desportoOrganizado', newVal)}
        columns={[
          {label: 'N.º'},
          {label: 'Nome atividade'},
          {label: 'Modalidade'},
          {label: 'Data e local'},
          {label: 'Objetivos'},
          {label: 'Est. H', center: true},
          {label: 'Est. M', center: true},
          {label: 'Doc. H', center: true},
          {label: 'Doc. M', center: true},
          {label: 'Total', center: true},
        ]}
        renderRow={(r, i, update) => (
          <>
            <td style={{...td,textAlign:'center',width:30}}>{i+1}</td>
            <td style={td}><TextInput value={r.nome_atividade} onChange={(v)=>update(i,'nome_atividade',v)} placeholder="Nome" width={140} /></td>
            <td style={td}><TextInput value={r.modalidade} onChange={(v)=>update(i,'modalidade',v)} placeholder="Modalidade" width={100} /></td>
            <td style={td}><TextInput value={r.data_local} onChange={(v)=>update(i,'data_local',v)} placeholder="Data/Local" width={100} /></td>
            <td style={td}><TextInput value={r.objetivos} onChange={(v)=>update(i,'objetivos',v)} placeholder="Objetivos" width={120} /></td>
            <td style={td}><NumInput value={r.estudantes_h??''} onChange={(v)=>update(i,'estudantes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.estudantes_m??''} onChange={(v)=>update(i,'estudantes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_h??''} onChange={(v)=>update(i,'docentes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_m??''} onChange={(v)=>update(i,'docentes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={{...td,textAlign:'center',fontWeight:500}}>{(r.estudantes_h||0)+(r.estudantes_m||0)+(r.docentes_h||0)+(r.docentes_m||0)}</td>
          </>
        )}
        emptyRow={emptyDesportoOrganizado}
      />

      {/* 2. Participação em Eventos Desportivos */}
      <TableSection
        title="2. Participação em Eventos Desportivos Organizados por Outras Entidades"
        description="Entidade organizadora, data, local, objetivos, resultados e participantes"
        items={c.desportoParticipacao || []}
        setItems={(newVal) => updateCultura('desportoParticipacao', newVal)}
        columns={[
          {label: 'N.º'},
          {label: 'Nome atividade'},
          {label: 'Entidade org.'},
          {label: 'Data e local'},
          {label: 'Objetivos'},
          {label: 'Est. H', center: true},
          {label: 'Est. M', center: true},
          {label: 'Doc. H', center: true},
          {label: 'Doc. M', center: true},
          {label: 'Classificação'},
          {label: 'Total', center: true},
        ]}
        renderRow={(r, i, update) => (
          <>
            <td style={{...td,textAlign:'center',width:30}}>{i+1}</td>
            <td style={td}><TextInput value={r.nome_atividade} onChange={(v)=>update(i,'nome_atividade',v)} placeholder="Nome" width={120} /></td>
            <td style={td}><TextInput value={r.entidade_org} onChange={(v)=>update(i,'entidade_org',v)} placeholder="Entidade" width={110} /></td>
            <td style={td}><TextInput value={r.data_local} onChange={(v)=>update(i,'data_local',v)} placeholder="Data/Local" width={100} /></td>
            <td style={td}><TextInput value={r.objetivos} onChange={(v)=>update(i,'objetivos',v)} placeholder="Objetivos" width={100} /></td>
            <td style={td}><NumInput value={r.estudantes_h??''} onChange={(v)=>update(i,'estudantes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.estudantes_m??''} onChange={(v)=>update(i,'estudantes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_h??''} onChange={(v)=>update(i,'docentes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_m??''} onChange={(v)=>update(i,'docentes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><TextInput value={r.classificacao} onChange={(v)=>update(i,'classificacao',v)} placeholder="Resultado" width={100} /></td>
            <td style={{...td,textAlign:'center',fontWeight:500}}>{(r.estudantes_h||0)+(r.estudantes_m||0)+(r.docentes_h||0)+(r.docentes_m||0)}</td>
          </>
        )}
        emptyRow={emptyDesportoParticipacao}
      />

      {/* 3. Atividades Culturais Organizadas */}
      <TableSection
        title="3. Atividades Culturais Organizadas"
        description="Tipo de atividade, data, local, objetivos e artistas envolvidos"
        items={c.culturaOrganizada || []}
        setItems={(newVal) => updateCultura('culturaOrganizada', newVal)}
        columns={[
          {label: 'N.º'},
          {label: 'Nome atividade'},
          {label: 'Tipo'},
          {label: 'Data e local'},
          {label: 'Objetivos'},
          {label: 'Est. H', center: true},
          {label: 'Est. M', center: true},
          {label: 'Doc. H', center: true},
          {label: 'Doc. M', center: true},
          {label: 'Total', center: true},
        ]}
        renderRow={(r, i, update) => (
          <>
            <td style={{...td,textAlign:'center',width:30}}>{i+1}</td>
            <td style={td}><TextInput value={r.nome_atividade} onChange={(v)=>update(i,'nome_atividade',v)} placeholder="Nome" width={140} /></td>
            <td style={td}><TextInput value={r.tipo_atividade} onChange={(v)=>update(i,'tipo_atividade',v)} placeholder="Tipo" width={100} /></td>
            <td style={td}><TextInput value={r.data_local} onChange={(v)=>update(i,'data_local',v)} placeholder="Data/Local" width={100} /></td>
            <td style={td}><TextInput value={r.objetivos} onChange={(v)=>update(i,'objetivos',v)} placeholder="Objetivos" width={120} /></td>
            <td style={td}><NumInput value={r.estudantes_h??''} onChange={(v)=>update(i,'estudantes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.estudantes_m??''} onChange={(v)=>update(i,'estudantes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_h??''} onChange={(v)=>update(i,'docentes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_m??''} onChange={(v)=>update(i,'docentes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={{...td,textAlign:'center',fontWeight:500}}>{(r.estudantes_h||0)+(r.estudantes_m||0)+(r.docentes_h||0)+(r.docentes_m||0)}</td>
          </>
        )}
        emptyRow={emptyCulturaOrganizada}
      />

      {/* 4. Participação em Atividades Culturais */}
      <TableSection
        title="4. Participação em Atividades Culturais Organizadas por Outras Entidades"
        description="Entidade organizadora, data, local, objetivos, distinções e artistas"
        items={c.culturaParticipacao || []}
        setItems={(newVal) => updateCultura('culturaParticipacao', newVal)}
        columns={[
          {label: 'N.º'},
          {label: 'Nome evento'},
          {label: 'Entidade org.'},
          {label: 'Data e local'},
          {label: 'Objetivos'},
          {label: 'Est. H', center: true},
          {label: 'Est. M', center: true},
          {label: 'Doc. H', center: true},
          {label: 'Doc. M', center: true},
          {label: 'Distinções'},
          {label: 'Total', center: true},
        ]}
        renderRow={(r, i, update) => (
          <>
            <td style={{...td,textAlign:'center',width:30}}>{i+1}</td>
            <td style={td}><TextInput value={r.nome_evento} onChange={(v)=>update(i,'nome_evento',v)} placeholder="Nome" width={120} /></td>
            <td style={td}><TextInput value={r.entidade_org} onChange={(v)=>update(i,'entidade_org',v)} placeholder="Entidade" width={110} /></td>
            <td style={td}><TextInput value={r.data_local} onChange={(v)=>update(i,'data_local',v)} placeholder="Data/Local" width={100} /></td>
            <td style={td}><TextInput value={r.objetivos} onChange={(v)=>update(i,'objetivos',v)} placeholder="Objetivos" width={100} /></td>
            <td style={td}><NumInput value={r.estudantes_h??''} onChange={(v)=>update(i,'estudantes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.estudantes_m??''} onChange={(v)=>update(i,'estudantes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_h??''} onChange={(v)=>update(i,'docentes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_m??''} onChange={(v)=>update(i,'docentes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><TextInput value={r.distincoes} onChange={(v)=>update(i,'distincoes',v)} placeholder="Distinções" width={110} /></td>
            <td style={{...td,textAlign:'center',fontWeight:500}}>{(r.estudantes_h||0)+(r.estudantes_m||0)+(r.docentes_h||0)+(r.docentes_m||0)}</td>
          </>
        )}
        emptyRow={emptyCulturaParticipacao}
      />

      {/* 5. Grupos Culturais */}
      <TableSection
        title="5. Grupos Culturais Existentes"
        description="Expressão artística, objetivos, membros e distinções"
        items={c.grupos || []}
        setItems={(newVal) => updateCultura('grupos', newVal)}
        columns={[
          {label: 'N.º'},
          {label: 'Nome grupo'},
          {label: 'Expressão artística'},
          {label: 'Objetivos'},
          {label: 'Est. H', center: true},
          {label: 'Est. M', center: true},
          {label: 'Doc. H', center: true},
          {label: 'Doc. M', center: true},
          {label: 'Distinções'},
          {label: 'Total', center: true},
        ]}
        renderRow={(r, i, update) => (
          <>
            <td style={{...td,textAlign:'center',width:30}}>{i+1}</td>
            <td style={td}><TextInput value={r.nome_grupo} onChange={(v)=>update(i,'nome_grupo',v)} placeholder="Nome" width={130} /></td>
            <td style={td}><TextInput value={r.expressao_artistica} onChange={(v)=>update(i,'expressao_artistica',v)} placeholder="Expressão" width={130} /></td>
            <td style={td}><TextInput value={r.objetivos} onChange={(v)=>update(i,'objetivos',v)} placeholder="Objetivos" width={120} /></td>
            <td style={td}><NumInput value={r.estudantes_h??''} onChange={(v)=>update(i,'estudantes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.estudantes_m??''} onChange={(v)=>update(i,'estudantes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_h??''} onChange={(v)=>update(i,'docentes_h',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><NumInput value={r.docentes_m??''} onChange={(v)=>update(i,'docentes_m',parseInt(v)||0)} style={{width:50}} /></td>
            <td style={td}><TextInput value={r.distincoes} onChange={(v)=>update(i,'distincoes',v)} placeholder="Distinções" width={110} /></td>
            <td style={{...td,textAlign:'center',fontWeight:500}}>{(r.estudantes_h||0)+(r.estudantes_m||0)+(r.docentes_h||0)+(r.docentes_m||0)}</td>
          </>
        )}
        emptyRow={emptyGrupo}
      />

      {/* 6. Tuna Académica */}
      <TableSection
        title="6. Tuna Académica"
        description="Membros da tuna académica da unidade orgânica"
        items={c.tuna || []}
        setItems={(newVal) => updateCultura('tuna', newVal)}
        columns={[
          {label: 'N.º'},
          {label: 'Nome membro'},
          {label: 'Cargo/Função'},
          {label: 'Ano ingresso'},
          {label: 'Objetivos'},
          {label: 'Distinções'},
        ]}
        renderRow={(r, i, update) => (
          <>
            <td style={{...td,textAlign:'center',width:30}}>{i+1}</td>
            <td style={td}><TextInput value={r.nome_membro} onChange={(v)=>update(i,'nome_membro',v)} placeholder="Nome" width={130} /></td>
            <td style={td}><TextInput value={r.cargo} onChange={(v)=>update(i,'cargo',v)} placeholder="Cargo" width={120} /></td>
            <td style={td}><NumInput value={r.ano_ingresso??''} onChange={(v)=>update(i,'ano_ingresso',parseInt(v)||null)} style={{width:90}} /></td>
            <td style={td}><TextInput value={r.objetivos} onChange={(v)=>update(i,'objetivos',v)} placeholder="Objetivos" width={150} /></td>
            <td style={td}><TextInput value={r.distincoes} onChange={(v)=>update(i,'distincoes',v)} placeholder="Distinções" width={130} /></td>
          </>
        )}
        emptyRow={emptyTunaAtleta}
      />

      {/* 7. Estudantes em Atividades */}
      <TableSection
        title="7. Estudantes Envolvidos em Atividades Culturais e Desportivas"
        description="Lista de estudantes, cursos e atividades"
        items={c.estudantesAtividades || []}
        setItems={(newVal) => updateCultura('estudantesAtividades', newVal)}
        columns={[
          {label: 'N.º'},
          {label: 'Nome completo'},
          {label: 'N.º estudante'},
          {label: 'Curso'},
          {label: 'Ano freq.'},
          {label: 'Sexo'},
          {label: 'Atividade'},
          {label: 'Evento'},
        ]}
        renderRow={(r, i, update) => (
          <>
            <td style={{...td,textAlign:'center',width:30}}>{i+1}</td>
            <td style={td}><TextInput value={r.nome_completo} onChange={(v)=>update(i,'nome_completo',v)} placeholder="Nome" width={140} /></td>
            <td style={td}><TextInput value={r.num_estudante} onChange={(v)=>update(i,'num_estudante',v)} placeholder="N.º" width={90} /></td>
            <td style={td}><TextInput value={r.curso} onChange={(v)=>update(i,'curso',v)} placeholder="Curso" width={100} /></td>
            <td style={td}><TextInput value={r.ano_frequencia} onChange={(v)=>update(i,'ano_frequencia',v)} placeholder="Ano" width={70} /></td>
            <td style={td}>
              <select value={r.sexo||''} onChange={(e)=>update(i,'sexo',e.target.value)} style={{border:'none',background:'transparent',fontSize:12,width:60}}>
                <option value="">-</option>
                <option value="H">Homem</option>
                <option value="M">Mulher</option>
              </select>
            </td>
            <td style={td}><TextInput value={r.atividade} onChange={(v)=>update(i,'atividade',v)} placeholder="Atividade" width={120} /></td>
            <td style={td}><TextInput value={r.evento} onChange={(v)=>update(i,'evento',v)} placeholder="Evento" width={120} /></td>
          </>
        )}
        emptyRow={emptyEstudanteAtividade}
      />

      {/* Summary */}
      <SectionTitle style={{marginTop:20}}>Resumo Consolidado</SectionTitle>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,padding:'12px 0'}}>
        <div style={{border:'0.5px solid var(--color-border-tertiary)',padding:12,borderRadius:4}}>
          <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:4}}>Eventos Desportivos</div>
          <div style={{fontSize:18,fontWeight:600,color:'#185FA5'}}>{c.desportoOrganizado?.length||0} org. + {c.desportoParticipacao?.length||0} part.</div>
        </div>
        <div style={{border:'0.5px solid var(--color-border-tertiary)',padding:12,borderRadius:4}}>
          <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:4}}>Eventos Culturais</div>
          <div style={{fontSize:18,fontWeight:600,color:'#185FA5'}}>{c.culturaOrganizada?.length||0} org. + {c.culturaParticipacao?.length||0} part.</div>
        </div>
        <div style={{border:'0.5px solid var(--color-border-tertiary)',padding:12,borderRadius:4}}>
          <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:4}}>Estudantes em Desporto</div>
          <div style={{fontSize:18,fontWeight:600,color:'#185FA5'}}>{countTotal([...(c.desportoOrganizado||[]),...(c.desportoParticipacao||[])], 'estudantes_h', 'estudantes_m')}</div>
        </div>
        <div style={{border:'0.5px solid var(--color-border-tertiary)',padding:12,borderRadius:4}}>
          <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:4}}>Estudantes em Cultura</div>
          <div style={{fontSize:18,fontWeight:600,color:'#185FA5'}}>{countTotal([...(c.culturaOrganizada||[]),...(c.culturaParticipacao||[]),...(c.grupos||[])], 'estudantes_h', 'estudantes_m')}</div>
        </div>
        <div style={{border:'0.5px solid var(--color-border-tertiary)',padding:12,borderRadius:4}}>
          <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:4}}>Grupos Culturais</div>
          <div style={{fontSize:18,fontWeight:600,color:'#185FA5'}}>{c.grupos?.length||0}</div>
        </div>
        <div style={{border:'0.5px solid var(--color-border-tertiary)',padding:12,borderRadius:4}}>
          <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:4}}>Membros Tuna</div>
          <div style={{fontSize:18,fontWeight:600,color:'#185FA5'}}>{c.tuna?.length||0}</div>
        </div>
      </div>
    </Card>
  );
}
