#!/bin/bash

# ツリーに出力しない（除外する）ディレクトリ
IGNORE_DIRS=("node_modules" ".git" ".next" ".turbo")

is_ignored() {
  local item="$1"
  for ignore in "${IGNORE_DIRS[@]}"; do
    if [[ "$item" == "$ignore" ]]; then
      return 0
    fi
  done
  return 1
}

print_tree() {
  local dir="$1"
  local prefix="$2"
  
  # ディレクトリ内のアイテムを取得 (隠しファイル・フォルダも含む)
  shopt -s nullglob dotglob
  local files=("$dir"/*)
  shopt -u nullglob dotglob

  local items=()
  for file in "${files[@]}"; do
    local basename="${file##*/}"
    if [[ "$basename" == "." || "$basename" == ".." ]]; then
      continue
    fi
    items+=("$basename")
  done

  local count=${#items[@]}
  local i=0

  for basename in "${items[@]}"; do
    ((i++))
    local path="$dir/$basename"
    
    local branch="├── "
    local next_prefix="$prefix│   "
    if [[ $i -eq $count ]]; then
      branch="└── "
      next_prefix="$prefix    "
    fi

    echo "${prefix}${branch}${basename}"

    # ディレクトリなら中身を再帰的に見る
    if [[ -d "$path" ]]; then
      if ! is_ignored "$basename"; then
        print_tree "$path" "$next_prefix"
      fi
    fi
  done
}

# ルートのフォルダ名を表示
echo "${PWD##*/}"
print_tree "." ""
