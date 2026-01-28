#!/usr/bin/env bash
set -e
mkdir -p with_hidden
echo "visible" > with_hidden/visible.txt
echo "hidden" > with_hidden/.hidden
