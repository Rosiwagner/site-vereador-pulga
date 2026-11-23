# Site do Pulga — como colocar no ar

O site tem estas páginas:

- **equipe.html**: fotos, nomes e funções da equipe.

- **index.html**: a página inicial, para os cidadãos. Mostra o que está acontecendo agora, as próximas ações, os projetos apoiados, as ações já realizadas e um calendário.
- **projetos.html** e **projeto.html**: os projetos apoiados, com a agenda e os álbuns de cada um.
- **albuns.html** e **album.html**: os álbuns de fotos e vídeos (de um projeto ou avulsos).
- **admin.html**: o botão laranja **Administrador** (com usuário e senha), para criar, editar e excluir agenda, projetos, álbuns, fotos, vídeos, equipe e participantes.

Tudo é feito com HTML, CSS e JavaScript puros. Não precisa instalar nada.

---

## Passo 0: testar no seu computador (opcional, 1 minuto)

1. Baixe o arquivo `site-vereador-pulga.zip` e descompacte.
2. Dê dois cliques em `index.html`. O site abre no navegador em **modo demonstração**, com eventos de exemplo.
3. Clique em "Administrador" e teste os cadastros.

No modo demonstração os dados ficam só no seu navegador. Os próximos passos ligam o site a um banco de dados de verdade.

---

## Passo 1: criar o banco de dados no Supabase (gratuito)

1. Entre em https://supabase.com e clique em **Start your project**. Você pode entrar com a sua conta do GitHub.
2. Clique em **New project**. Dê o nome `agenda-vereador-pulga`, crie uma senha forte para o banco (guarde-a) e escolha a região **South America (São Paulo)**.
3. Espere uns 2 minutos até o projeto ficar pronto.
4. No menu da esquerda, abra **SQL Editor** e clique em **New query**.
5. Abra o arquivo `supabase/schema.sql` (pode ser no Bloco de Notas), copie tudo e cole lá.
6. Clique em **Run**. Deve aparecer "Success". O seu e-mail (wcfarias.wf@gmail.com) já está no arquivo como **administrador geral**.
   Se um dia precisar rodar o arquivo de novo, pode: ele não apaga nada.

## Passo 2: preparar o login

1. No menu da esquerda, abra **Authentication** > **Sign In / Providers**. Em **Email**, deixe **Allow new users to sign up** e **Confirm email** **ligados** (é o padrão).
   Assim, para criar uma senha, a pessoa precisa clicar no link que chega no e-mail dela. Ninguém consegue criar a senha de um e-mail que não é seu.
2. Abra **Authentication** > **URL Configuration**. Em **Site URL**, coloque o endereço da área da equipe no GitHub Pages (você vai ter ele no passo 4), por exemplo:
   `https://SEU-USUARIO.github.io/agenda-vereador-pulga/admin.html`
   Em **Redirect URLs**, adicione o mesmo endereço.

### A sua senha de administrador geral

A senha **não fica em nenhum arquivo do site**, porque o site fica num repositório público no GitHub e qualquer pessoa poderia ler. Você cria a senha assim, depois do passo 4:

1. Clique no botão laranja **Administrador**.
2. Em **Usuário**, digite **wcfarias.wf@gmail.com**. Em **Senha**, digite a senha que você quer usar (mínimo 6 caracteres) e clique em **Entrar**.
3. Na primeira vez, o site cria a senha e pede para você confirmar pelo e-mail. Abra o e-mail do Supabase e clique no link. Se abrir uma página com erro, pode ignorar: a confirmação já foi feita.
4. Volte ao site, clique em **Administrador** e entre com o mesmo e-mail e senha. Pronto!

Como a senha que você pensou em usar já foi escrita numa conversa, o mais seguro é escolher uma senha nova nesse momento.

Se esquecer a senha: no Supabase, abra **Authentication** > **Users**, clique no seu usuário e use **Send password recovery**.

## Passo 3: ligar o site ao Supabase

1. No Supabase, abra **Project Settings** (engrenagem) > **API** (ou **Data API**).
2. Copie o **Project URL** e a chave **anon public**.
3. Abra o arquivo `js/config.js` no Bloco de Notas e cole os dois valores entre as aspas:

```js
SUPABASE_URL: "https://xxxxxxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
```

4. Salve o arquivo. Pode ficar tranquilo: essa chave "anon" é feita para ficar no site. Quem protege os dados são as regras de segurança que o `schema.sql` criou.

## Passo 4: publicar no GitHub Pages (gratuito)

1. Entre em https://github.com e clique em **New** (novo repositório).
2. Nome: `agenda-vereador-pulga`. Deixe como **Public** e clique em **Create repository**.
3. Na página que aparecer, clique no link **uploading an existing file**.
4. Arraste **todo o conteúdo** da pasta descompactada (os arquivos `.html` e as pastas `assets`, `css`, `js`, `vendor`, `supabase`). Clique em **Commit changes**.
5. Vá em **Settings** > **Pages**. Em **Branch**, escolha `main` e a pasta `/ (root)`, e clique em **Save**.
6. Em 1 ou 2 minutos o site estará no ar em:
   `https://SEU-USUARIO.github.io/agenda-vereador-pulga/`

A área da equipe fica em `.../agenda-vereador-pulga/admin.html`.

Para mudar algo depois, abra o arquivo no GitHub, clique no lápis (✏️), edite e clique em **Commit changes**.

---

## O que dá para fazer no botão Administrador

| Aba | Para quê |
|---|---|
| 📅 **Agenda** | Criar, editar e excluir eventos. Eles aparecem no calendário e em "Próximas ações". |
| 📌 **Projetos** | Criar, editar e excluir projetos (nome, data, texto e capa). |
| 📷 **Álbuns e fotos** | Criar álbuns (ligados a um projeto ou avulsos) e enviar, trocar a capa ou excluir fotos e vídeos. |
| 👥 **Equipe** | Pessoas da equipe com foto, que aparecem no menu Equipe. |
| **Participantes** | Lista de quem participa dos eventos (fica privada). |
| **Administradores** e **Registro de atividades** | Só aparecem para o administrador geral. |

**Para montar um álbum:**

1. Abra a aba **📷 Álbuns e fotos**, dê um nome, escolha a data e, se quiser, o projeto. Clique em **Salvar álbum**.
2. Logo abaixo aparece a caixa **Fotos e vídeos**. Escolha várias fotos de uma vez (do computador ou do celular). Para vídeos, envie o arquivo (até 50 MB) ou cole um link do YouTube, que é o melhor.
3. A primeira foto vira a capa. Para trocar a capa, clique na estrela ★ de outra foto.

O projeto e o álbum **Novos Bambas 2026 (Associação Xangô Capoeira)** já vêm criados, com o cartaz como capa.

O plano gratuito do Supabase guarda até 1 GB de arquivos. As fotos são reduzidas automaticamente, então isso dá para alguns milhares delas.

## Administrador geral e administradores

Existem dois tipos de acesso:

| | Administrador geral (você) | Administrador |
|---|---|---|
| Cadastrar eventos, álbuns, fotos, vídeos, equipe e participantes | ✅ | ✅ |
| Autorizar ou remover administradores | ✅ | ❌ |
| Ver o registro de atividades | ✅ | ❌ |

Essas regras ficam **no banco de dados**, não só na tela. Mesmo que alguém mexa no código do site, um administrador comum não consegue autorizar ninguém.

**Para autorizar alguém:**

1. Clique em **Administrador** e abra a aba **Administradores** (ela só aparece para você).
2. Digite o nome e o e-mail da pessoa e clique em **Autorizar**.
3. Avise a pessoa: ela clica em **Administrador**, digita o e-mail dela e a senha que quiser, e confirma pelo e-mail na primeira vez.

Para tirar o acesso de alguém, clique em **Remover acesso** na mesma aba. O administrador geral nunca pode ser removido pelo site.

## Registro de atividades

Tudo o que for **criado, editado ou apagado** (eventos, álbuns, fotos, vídeos, equipe, participantes e administradores) fica registrado automaticamente com **quem fez, o que fez e quando**. Você vê na aba **Registro de atividades** e pode filtrar por pessoa. Ninguém consegue apagar ou mudar esse registro pelo site.

## Página "Equipe"

Na aba **👥 Equipe**, cadastre cada pessoa com nome, função e foto. Quem estiver marcado com **Mostrar na página "Equipe"** aparece no menu **Equipe** do site, com foto, nome e função. O campo **Ordem** define quem aparece primeiro (números menores vêm antes). Telefone e e-mail nunca aparecem para o público.

## O que é público e o que é privado

- **Público:** todos os eventos, projetos, álbuns com fotos e vídeos, e a página Equipe (foto, nome e função).
- **Privado (só administradores veem):** telefones e e-mails, a lista de participantes, a lista de administradores, o registro de atividades e qualquer item que você desmarcar em "Mostrar no site público".

## Bom saber

- O plano gratuito do Supabase **pausa o projeto se ficar 7 dias sem nenhum acesso**. Com o site no ar e sendo visitado, isso não acontece. Se pausar, é só entrar no Supabase e clicar em **Restore**.
- Para mudar as cores, edite as primeiras linhas de `css/estilo.css`. O logo e o cartaz da página inicial ficam na pasta `assets`: para trocar, envie uma imagem nova com o mesmo nome.
- Para mudar o menu do topo ou a frase do rodapé, edite `js/layout.js`.
- Para mudar o nome e a frase do topo, edite `js/config.js`.
