# aneta-cbtc

## Dev environment

```
$ nix develop
```

## Running executable

```
[nix develop:~/aneta-cbtc]$ cabal run
```

## Running test
```
[nix develop:~/aneta-cbtc]$ cabal run aneta-cbtc-test
```

## Running hoogle

```
[nix develop:~/aneta-cbtc]$ hoogle server --local --port=8085
```

## Precommits

### Run `,format` before commits cabal *.hs *.nix *.cabal

```
[nix develop:~/aneta-cbtc]$ ,format 
```

### Format check
```
[nix develop:~/aneta-cbtc]$ ,format check
```

## Using HLS

- Install [Nix Environment Selector](https://marketplace.visualstudio.com/items?itemName=arrterian.nix-env-selector)

- Open Command Palette (Ctrl + Shift + P) and run Nix-Env: Select Environment command.

- Select `shell.nix`
- Wait and Restart VSCode