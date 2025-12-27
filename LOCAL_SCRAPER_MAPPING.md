# Local Scraper to State Mapping

This document maps local/city government scrapers to their respective state scrapers.

## Current Status

| State | State Code | Capital/Major City | Local Scraper File | Currently Integrated? |
|-------|------------|-------------------|-------------------|----------------------|
| Alabama | AL | Montgomery | `montgomery.ts` | ❌ NO |
| Alabama | AL | Birmingham | `birmingham.ts` | ❌ NO |
| Alaska | AK | Juneau | `juneau.ts` | ✅ YES |
| Arkansas | AR | Little Rock | `little-rock.ts` | ❌ NO |
| Connecticut | CT | Bridgeport | `bridgeport.ts` | ❌ NO |
| Idaho | ID | Boise | `boise.ts` | ❌ NO |
| Iowa | IA | Des Moines | `des-moines.ts` | ❌ NO |
| Kentucky | KY | Lexington | `lexington.ts` | ❌ NO |
| Louisiana | LA | Baton Rouge | `baton-rouge.ts` | ❌ NO |
| Mississippi | MS | Jackson | `jackson.ts` | ❌ NO |
| Montana | MT | Helena | `helena.ts` | ❌ NO |
| Nevada | NV | Las Vegas | `las-vegas.ts` | ❌ NO |
| New Mexico | NM | Santa Fe | `santa-fe.ts` | ❌ NO |
| New York | NY | NYC | `nyc-council.ts` | ❌ NO |
| Oklahoma | OK | Oklahoma City | `oklahoma-city.ts` | ❌ NO |
| Oregon | OR | Portland | `portland.ts` | ❌ NO |
| Utah | UT | Salt Lake City | `salt-lake-city.ts` | ❌ NO |
| Vermont | VT | Montpelier | `montpelier.ts` | ❌ NO |

## Integration Checklist

### High Priority (State capitals)
- [ ] Montgomery, AL → `alabama.ts`
- [ ] Little Rock, AR → `arkansas.ts`
- [ ] Boise, ID → `idaho.ts`
- [ ] Des Moines, IA → `iowa.ts`
- [ ] Baton Rouge, LA → `louisiana.ts`
- [ ] Jackson, MS → `mississippi.ts`
- [ ] Helena, MT → `montana.ts`
- [ ] Santa Fe, NM → `new-mexico.ts`
- [ ] Oklahoma City, OK → `oklahoma.ts`
- [ ] Salem, OR → `oregon.ts` (wait, we have Portland not Salem?)
- [ ] Salt Lake City, UT → `utah.ts`
- [ ] Montpelier, VT → `vermont.ts`

### Medium Priority (Major cities)
- [ ] Birmingham, AL → `alabama.ts`
- [ ] Bridgeport, CT → `connecticut.ts`
- [ ] Las Vegas, NV → `nevada.ts`
- [ ] NYC, NY → `new-york.ts`
- [ ] Portland, OR → `oregon.ts`
- [ ] Lexington, KY → `kentucky.ts`

## Notes

- **Alaska (Juneau)**: Already integrated ✅
- **Oregon**: We have Portland scraper (major city) not Salem (capital)
- **Alabama**: Two scrapers (Montgomery capital + Birmingham major city)
- Some scrapers may need capital cities instead of what we have
