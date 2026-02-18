# Quickstart: Multi-Lens

## Create a lens

```bash
brane lens create security
# created .brane/lens/security/body.db
# created .brane/lens/security/mind.db
```

## Switch to it

```bash
brane lens use security
# active lens: security
```

## Ingest into the active lens

```bash
brane ingest src/
# files scanned into security lens
```

## List all lenses

```bash
brane lens list
#   default
# * security
```

## Switch back

```bash
brane lens use default
# active lens: default
```

## Create a lens from YAML config

```bash
brane lens create analysis --config ontology.yml
# created .brane/lens/analysis/ with pre-loaded types and relations
```

## Delete a lens

```bash
brane lens delete analysis
# deleted .brane/lens/analysis/
```

## Migrate flat layout (optional)

```bash
brane lens migrate
# moved .brane/body.db → .brane/lens/default/body.db
# moved .brane/mind.db → .brane/lens/default/mind.db
```

## Backward compatibility

Existing projects work without changes. The old `.brane/body.db` + `.brane/mind.db` layout is automatically detected as the "default" lens.
