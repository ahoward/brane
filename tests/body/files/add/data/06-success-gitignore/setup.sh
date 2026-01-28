#!/usr/bin/env bash
set -e
mkdir -p ignored
echo "keep this" > ignored/keep.txt
echo "ignore this" > ignored/skip.log
echo "*.log" > .gitignore
