import fs from 'node:fs';

const replacements = [
  {
    file: 'src/routes/workspace.marketing.canvas-pecados.tsx',
    targets: [
      {
        from: '1. Escolha a Alavanca Subconsciente (O Pecado Capital)',
        to: 'Alavanca Subconsciente'
      },
      {
        from: '2. Copy Estruturada pelo Head Copywriter V4',
        to: 'Copy Estruturada'
      },
      {
        from: '3. Relatório Forense SimLab V2 (Personas Sintéticas)',
        to: 'Relatório SimLab'
      }
    ]
  },
  {
    file: 'src/components/tourism/groups/rooming-list-manager.tsx',
    targets: [
      {
        from: 'Copiar lista formatada para enviar à recepção do hotel via WhatsApp',
        to: 'Copiar lista para WhatsApp'
      },
      {
        from: 'Exportar planilha CSV / Excel para o hotel',
        to: 'Exportar planilha CSV'
      },
      {
        from: 'Exportar documento PDF formatado para a recepção',
        to: 'Exportar documento PDF'
      }
    ]
  },
  {
    file: 'src/components/studio/carousel-wizard-modal.tsx',
    targets: [
      {
        from: 'Waesy Creative Studio · Gerador de Carrosséis',
        to: 'Gerador de Carrosséis'
      }
    ]
  },
  {
    file: 'src/components/ui/image-upload.tsx',
    targets: [
      {
        from: 'Clique para enviar imagem 1:1 ou cole com Ctrl+V',
        to: 'Enviar imagem 1:1'
      }
    ]
  },
  {
    file: 'src/components/workspace/kanban/kanban-column-customizer-modal.tsx',
    targets: [
      {
        from: 'Propósito da etapa no fluxo de negócio',
        to: 'Propósito da Etapa'
      }
    ]
  },
  {
    file: 'src/components/profile/occupation-autocomplete.tsx',
    targets: [
      {
        from: 'Cargo verificado no catálogo oficial de carreiras',
        to: 'Cargo Verificado'
      }
    ]
  },
  {
    file: 'src/components/shell/admin-contextual-bar.tsx',
    targets: [
      {
        from: 'Admin Master Ativo - Clique para expandir',
        to: 'Admin Master'
      }
    ]
  },
  {
    file: 'src/components/shell/top-bar.tsx',
    targets: [
      {
        from: 'Plataforma em Versão Beta — Saiba mais',
        to: 'Versão Beta'
      }
    ]
  },
  {
    file: 'src/components/tourism/studio/studio-sidebar-editor.tsx',
    targets: [
      {
        from: 'Sugerir dias a partir dos passeios oficiais do destino',
        to: 'Sugerir Roteiro'
      }
    ]
  }
];

let totalModified = 0;
for (const item of replacements) {
  if (fs.existsSync(item.file)) {
    let content = fs.readFileSync(item.file, 'utf8');
    let fileChanged = false;
    for (const t of item.targets) {
      if (content.includes(t.from)) {
        content = content.replaceAll(t.from, t.to);
        fileChanged = true;
        console.log(`Replaced in ${item.file}: "${t.from}" -> "${t.to}"`);
      } else {
        console.log(`Target not found in ${item.file}: "${t.from}"`);
      }
    }
    if (fileChanged) {
      fs.writeFileSync(item.file, content, 'utf8');
      totalModified++;
    }
  } else {
    console.log(`File not found: ${item.file}`);
  }
}

console.log(`Total files modified: ${totalModified}`);
