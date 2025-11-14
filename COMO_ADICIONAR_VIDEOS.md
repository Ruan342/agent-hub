# Como Adicionar Vídeos de Demonstração

## Opção 1: Vídeo do YouTube

1. Faça upload do seu vídeo no YouTube
2. Obtenha o ID do vídeo (exemplo: se a URL é `https://www.youtube.com/watch?v=dQw4w9WgXcQ`, o ID é `dQw4w9WgXcQ`)
3. No arquivo `/app/frontend/src/pages/Landing.jsx`, localize o comentário que diz `{/* Para adicionar vídeo real, substitua por: */}`
4. Descomente o código do iframe e substitua `SEU_VIDEO_ID` pelo ID do seu vídeo:

```jsx
<iframe 
  className="w-full h-full"
  src="https://www.youtube.com/embed/SEU_VIDEO_ID"
  title="Demo VoiceAI Hub"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
/>
```

**Exemplo com ID real:**
```jsx
<iframe 
  className="w-full h-full"
  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  title="Demo VoiceAI Hub"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
/>
```

## Opção 2: Vídeo do Vimeo

1. Faça upload do seu vídeo no Vimeo
2. Obtenha o ID do vídeo (exemplo: se a URL é `https://vimeo.com/123456789`, o ID é `123456789`)
3. Use este código:

```jsx
<iframe 
  className="w-full h-full"
  src="https://player.vimeo.com/video/SEU_VIDEO_ID"
  title="Demo VoiceAI Hub"
  frameBorder="0"
  allow="autoplay; fullscreen; picture-in-picture"
  allowFullScreen
/>
```

## Opção 3: Vídeo Hospedado (MP4)

Se você tiver o vídeo hospedado em seu próprio servidor ou CDN:

```jsx
<video 
  className="w-full h-full object-cover"
  controls
  poster="/path/to/thumbnail.jpg"
>
  <source src="https://seu-servidor.com/video-demo.mp4" type="video/mp4" />
  Seu navegador não suporta vídeos HTML5.
</video>
```

## Opção 4: Loom (Popular para demos de software)

1. Grave seu vídeo no Loom
2. Clique em "Share" e copie o embed code
3. Cole o código fornecido pelo Loom

```jsx
<div style={{position: 'relative', paddingBottom: '56.25%', height: 0}}>
  <iframe 
    src="https://www.loom.com/embed/SEU_VIDEO_ID"
    frameBorder="0" 
    webkitallowfullscreen 
    mozallowfullscreen 
    allowFullScreen 
    style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
  />
</div>
```

## Dicas para o Vídeo de Demonstração

### Conteúdo Sugerido (2-3 minutos):
1. **Intro (10s)**: "Veja como o VoiceAI Hub funciona"
2. **Navegação no Marketplace (30s)**: Mostre os agentes disponíveis
3. **Processo de Compra (30s)**: Demonstre o checkout
4. **Dashboard (30s)**: Mostre a API key e webhook
5. **Exemplo de Integração (40s)**: Code snippet ou demo de chamada
6. **Benefícios (20s)**: Recap dos principais benefícios
7. **CTA (10s)**: "Comece agora gratuitamente"

### Ferramentas Recomendadas para Gravar:
- **Loom**: Rápido e fácil, ótimo para demos
- **OBS Studio**: Grátis e profissional
- **Screen Studio**: Mac only, mas muito polido
- **Camtasia**: Editor completo com animações

### Boas Práticas:
- Use resolução 1920x1080 (Full HD)
- Ative microfone de qualidade
- Grave em ambiente silencioso
- Use cursor destacado para facilitar visualização
- Adicione legendas (closed captions)
- Mantenha ritmo dinâmico (não muito lento)
- Termine com CTA claro

## Testando Localmente

Após adicionar o vídeo, teste em:
- Chrome/Edge
- Firefox
- Safari
- Mobile (iOS e Android)

Certifique-se que:
- Vídeo carrega corretamente
- Controles funcionam
- Responsivo em mobile
- Autoplay está desabilitado (melhor UX)

## Múltiplos Vídeos

Se quiser adicionar mais vídeos (tutoriais específicos, casos de uso, etc.), você pode criar uma seção adicional:

```jsx
{/* Additional Videos Section */}
<div className="container mx-auto px-6 py-24">
  <h2 className="text-3xl font-bold text-center mb-12">Tutoriais</h2>
  <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
    <div>
      <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-4">
        <iframe src="..." className="w-full h-full" />
      </div>
      <h3 className="font-semibold">Como Integrar com WhatsApp</h3>
      <p className="text-sm text-gray-600">2 min</p>
    </div>
    {/* Mais vídeos... */}
  </div>
</div>
```

---

**Nota**: O placeholder atual (com botão Play) será automaticamente substituído quando você adicionar o iframe do vídeo real.
