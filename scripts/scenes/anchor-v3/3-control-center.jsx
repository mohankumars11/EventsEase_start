import React from 'react'
import { Page } from './shell'
import { CONTROL } from './data'
import PricingControlCenter from '../../../src/components/vendor/pricing/PricingControlCenter'
export default function Scene() { return <Page><div className="px-4 pb-6 pt-5"><PricingControlCenter data={CONTROL} /></div></Page> }
