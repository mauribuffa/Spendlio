Pill segmented control with a sliding thumb — switching views ("Spending / Income"), split modes ("Evenly / Exact / %").

```jsx
<SegmentedControl
  options={['Spending','Income']}
  value={tab} onChange={setTab} />
<SegmentedControl fullWidth value={mode} onChange={setMode}
  options={[{value:'even',label:'Evenly'},{value:'exact',label:'Exact'},{value:'pct',label:'%'}]} />
```
