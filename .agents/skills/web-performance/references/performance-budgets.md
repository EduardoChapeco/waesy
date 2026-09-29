# Orçamentos de Desempenho (Performance Budgets)

Limites quantitativos estritos para impedir a regressão de peso e latência de páginas web.

## Tabela de Orçamentos Máximos (Gzip/Brotli)
- **HTML Inicial:** < 50 KB
- **CSS Total da Rota:** < 100 KB
- **JavaScript Crítico:** < 300 KB
- **Mídia Acima da Dobra (Hero):** < 500 KB
- **Fontes Web:** < 100 KB (WOFF2 subset)
- **Total por Página:** < 1.5 MB

## Mecanismo de Alerta em CI/CD
Se um commit ou PR ultrapassar o orçamento em mais de 10%, o build de verificação deve falhar ou exigir aprovação expressa do Staff Architect.
