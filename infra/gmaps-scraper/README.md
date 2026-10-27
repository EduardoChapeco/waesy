# Google Maps Scraper: VPS grátis + Docker

O scraper (gosom/google-maps-scraper) precisa de um navegador Chromium headless. O Cloudflare Worker do Waesy não roda isso, então o serviço fica numa máquina própria. O Waesy só conversa com ele por HTTP.

## Precisa ser Docker?
Não, mas Docker é o caminho mais simples. Alternativas:

| Opção | Custo | Observação |
|---|---|---|
| Docker (recomendado) | grátis | Um comando sobe scraper e proxy HTTPS |
| Binário Go direto | grátis | Instale Chromium e dependências à mão; mais trabalho |
| PC local + Cloudflare Tunnel | grátis | Só funciona com o PC ligado |
| Apify / SerpApi (SaaS) | pago | Sem servidor, mas custa por resultado |
| Google Places API oficial | pago por uso | Sem risco de ToS, sem e-mails |

## Criar uma VPS grátis
1. **Oracle Cloud Always Free (melhor opção):** crie conta em cloud.oracle.com (exige cartão para verificação, sem cobrança). Crie uma instância `VM.Standard.A1.Flex` (ARM) com 2 OCPU e 12 GB, imagem Ubuntu 22.04. Baixe a chave SSH. Em Rede, libere as portas 80 e 443 na Security List.
2. **Google Cloud e2-micro:** grátis, mas 1 GB de RAM é pouco para Chromium. Evite.
3. A imagem `gosom/google-maps-scraper` tem build ARM64 e roda na Oracle A1.

## Configurar
```bash
ssh ubuntu@IP_DA_VPS
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT

git clone <repo-waesy> && cd waesy/infra/gmaps-scraper
cp .env.example .env
# edite .env: DOMAIN e SCRAPER_TOKEN (gere com: openssl rand -hex 32)
docker compose up -d
```
Aponte um registro DNS `A` do `DOMAIN` para o IP da VPS. O Caddy emite o HTTPS sozinho. Sem domínio, use o domínio gratuito do DuckDNS.

## Conectar no Waesy
Admin Master, Integrações, aba Google Maps Scraper:
1. URL: `https://SEU_DOMINIO`.
2. Token: o mesmo `SCRAPER_TOKEN`.
3. Clique em Testar conexão, depois Salvar com a integração ativa.
4. Use Coleta manual (ex.: "pizzarias" em Chapecó, SC).

## Segurança e conformidade
- O proxy responde 401 sem o token `Authorization: Bearer`. Não exponha a porta 8080 diretamente.
- Scraping do Google viola os Termos de Serviço: use só para prospecção interna.
- E-mails e telefones coletados estão sujeitos à LGPD. Mantenha base legal e canal de opt-out.
