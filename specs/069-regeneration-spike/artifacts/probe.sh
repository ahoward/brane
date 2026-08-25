#!/usr/bin/env bash
# Probes for behaviour the locked oracle does NOT cover.
BR="$1"; W=$(mktemp -d); cd $W
$BR init >/dev/null 2>&1
echo '{"name":"C","type":"Entity"}' | $BR /mind/concepts/create >/dev/null 2>&1
q() { python3 -c "import sys,json
try:
  d=json.load(sys.stdin)
  print(json.dumps(d.get('result') if d['status']=='success' else d['errors'],sort_keys=True))
except Exception as e: print('PARSE_FAIL')"; }

echo -n "A counter_key            : "
$BR /mind/claims/list '{}' >/dev/null 2>&1
python3 - "$W" <<'PY'
import subprocess,sys,json,glob
# read schema_meta keys via a rule query is not possible; grep the rocksdb dir instead
import os,re
d=os.path.join(sys.argv[1],".brane","mind.db")
found=set()
for root,_,files in os.walk(d):
    for f in files:
        try: blob=open(os.path.join(root,f),'rb').read()
        except: continue
        for m in re.findall(rb'[a-z_]*next_id', blob): found.add(m.decode())
print(sorted(found) or "none-yet")
PY

echo -n "B tie_same_assertion     : "
$BR /mind/authorities/create '{"name":"t2","rank":40,"description":"x"}' >/dev/null 2>&1
$BR /mind/claims/create '{"subject_type":"concept","subject_id":1,"predicate":"p","assertion":"same","authority":"legal","source":"a"}' >/dev/null 2>&1
$BR /mind/claims/create '{"subject_type":"concept","subject_id":1,"predicate":"p","assertion":"same","authority":"t2","source":"b"}' >/dev/null 2>&1
$BR /mind/claims/list '{"subject_id":1,"resolve":true}' 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin)['result'];print('count=',d['count'])"

echo -n "C limit_with_resolve     : "
$BR /mind/claims/create '{"subject_type":"concept","subject_id":1,"predicate":"q","assertion":"v1","authority":"product","source":"a"}' >/dev/null 2>&1
$BR /mind/claims/create '{"subject_type":"concept","subject_id":1,"predicate":"r","assertion":"v2","authority":"observation","source":"a"}' >/dev/null 2>&1
$BR /mind/claims/list '{"subject_id":1,"resolve":true,"limit":1}' 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin)['result'];print('count=',d['count'],'preds=',[c['predicate'] for c in d['claims']])"

echo -n "D long_authority_name    : "
A=$(python3 -c "print('x'*70)")
$BR /mind/claims/create "{\"subject_type\":\"concept\",\"subject_id\":1,\"predicate\":\"p\",\"assertion\":\"a\",\"authority\":\"$A\",\"source\":\"s\"}" 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);e=d['errors'];k=list(e)[0];print(k,e[k][0]['code'])"

echo -n "E two_missing_fields     : "
$BR /mind/claims/create '{"subject_type":"concept","subject_id":1}' 2>/dev/null | python3 -c "import sys,json;print(sorted(json.load(sys.stdin)['errors'].keys()))"

echo -n "F subject_type_untrimmed : "
$BR /mind/claims/create '{"subject_type":" concept","subject_id":1,"predicate":"p","assertion":"a","authority":"product","source":"s"}' 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['status'], (list(d['errors'])[0] if d['errors'] else ''))"

echo -n "G backslash_roundtrip    : "
$BR /mind/claims/create '{"subject_type":"concept","subject_id":1,"predicate":"bs","assertion":"a\\b","authority":"manual","source":"s"}' 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['status'], repr(d['result']['assertion']) if d['status']=='success' else '')"

echo -n "H unregistered_tier_read : "
$BR /mind/claims/list '{"authority":"nope"}' 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['status'],d['result']['count'] if d['status']=='success' else '')"

echo -n "I bad_subject_type_list  : "
$BR /mind/claims/list '{"subject_type":"episode"}' 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['status'])"

rm -rf $W
