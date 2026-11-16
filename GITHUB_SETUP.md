# Guía Segura para Subir el Repositorio a GitHub (`GITHUB_SETUP.md`)

Esta guía explica cómo conectar este proyecto a tu cuenta de GitHub desde tu computadora local sin exponer tokens ni credenciales en el historial de Git.

> **Regla de seguridad:** Nunca pegues un *Personal Access Token (PAT)* ni tu archivo `.env` dentro del código, en un commit o en un chat.

---

## 1. Requisitos previos en tu equipo local
1. Tener instalado **Git** y haber descargado/clonado este proyecto en tu carpeta local.
2. Verificar que `.gitignore` excluye archivos sensibles y pesados:
   - `.env` y `.env.*` (manteniendo solo `.env.example`)
   - `local-studio/` (clips, audios y exportaciones `.mp4` pesadas)
   - `node_modules/`, `dist/`, `*.pem`, `*.key`

Comprueba el estado antes de subir:
```bash
git status
```

---

## 2. Opción A (Recomendada): Autenticarte con GitHub CLI (`gh`)
Es el método más simple y seguro porque gestiona credenciales automáticamente fuera del repositorio:

```bash
# 1. Inicia sesión interactiva en tu navegador
gh auth login

# 2. Crea el repositorio y sube tu rama main directamente
gh repo create vibra-marketing-os --private --source=. --remote=origin --push
```

---

## 3. Opción B: Usar un Fine-Grained Personal Access Token (PAT)
Si prefieres crear el repositorio vacío desde **github.com** y conectarlo con HTTPS:

1. Entra a **GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens**.
2. Haz clic en **Generate new token**:
   - **Resource owner:** Tu usuario/organización.
   - **Repository access:** *Only select repositories* -> selecciona `vibra-marketing-os` (creado vacío en GitHub).
   - **Repository permissions:**
     - **Contents:** `Read and write` *(único permiso obligatorio para hacer push de código)*.
     - **Metadata:** `Read-only` *(automático)*.
   - **Expiration:** Elige 30 o 90 días por buena higiene de seguridad.
3. Conecta el remoto sin incluir el token dentro de la URL del remoto:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/vibra-marketing-os.git
   git branch -M main
   git push -u origin main
   ```
4. Cuando Git pida tu **Username**, escribe tu usuario de GitHub; cuando pida **Password**, pega el PAT (el Administrador de Credenciales de Windows / Keychain de macOS / `git-credential` de Linux lo guardará de forma segura).

---

## 4. Configuración Local Opcional de Variables de Entorno
Si deseas habilitar las funciones de IA del servidor (`POST /api/gemini/script`, `/api/gemini/tts`, `/api/gemini/video`), crea un archivo `.env` local (ignorado por Git) basado en `.env.example`:

```bash
cp .env.example .env
# Edita .env en tu equipo y define GEMINI_API_KEY=...
```

Si decides no configurar `GEMINI_API_KEY`, el estudio funcionará al 100% con tus archivos locales en `local-studio/clips/`, `local-studio/audio/` y `local-studio/resources/` más el puente de prompts para Google Flow y agentes MCP.
