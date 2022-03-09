# @reddotlabs/multicall-react

React hook to interact with multicall contract. All calls will be queued and merged to a number of aggregation call to reduce more traffic.

## Usage

```tsx
<QueuedMulticallProvider rpcProvider={} multicallAddress={}>
  {/*App content*/}
</QueuedMulticallProvider>

```

```tsx
const multicall = useMulticall()

useEffect(() => {
  multicall.enqueue([
    {
      target: '',
      signature: 'balanceOf(address) returns(uint256)',
      params: []
    }
  ])
}, [])

```