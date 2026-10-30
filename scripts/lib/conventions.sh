# Convenções compartilhadas pelos scripts de card, branch e commit.
# Altere aqui (e no AGENTS.md) para mudar o padrão do projeto inteiro.

COMMIT_TYPES="feat fix refactor perf test style docs chore ci build revert"
SCOPED_TYPES="feat fix refactor perf test style"
COMMIT_SCOPES="auth perfil produtos categorias custos vendas contas dashboard pricing taxas alerts sebrae tours ui layout menu precision security api db infra devops ci deps docs agentes assistente"
CARD_TYPES="US TECH BUG INFRA DOCS"
BRANCH_PREFIXES="feature fix test refactor chore docs"
MAX_HEADER_LENGTH=100
BASE_BRANCH="develop"
PROJECT_OWNER="Camocardi"
PROJECT_NUMBER=1

contains_word() {
  case " $1 " in *" $2 "*) return 0 ;; *) return 1 ;; esac
}

slugify() {
  printf '%s' "$1" \
    | perl -CS -MUnicode::Normalize -pe '$_ = NFD($_); s/\p{Mn}//g; $_ = lc; s/[^a-z0-9]+/-/g; s/^-+|-+$//g; s/^(.{1,50})(-.*)?$/$1/ if length > 50'
}

card_id_from_branch() {
  printf '%s' "$1" | sed -nE 's#^[a-z]+/(us|tech|bug|infra|docs)-([0-9]+)(-.*)?$#\1-\2#p' | tr '[:lower:]' '[:upper:]'
}

default_branch_prefix() {
  case "$1" in
    US) echo feature ;;
    BUG) echo fix ;;
    DOCS) echo docs ;;
    *) echo chore ;;
  esac
}

die() {
  echo "erro: $*" >&2
  exit 1
}
