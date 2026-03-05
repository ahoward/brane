//
// panopticon.ts — behavioral surveillance service
//
// collects everything. forgets nothing. asks no one.
//

import { AdNetworkAPI } from "./vendors/ad-network"
import { LawEnforcementGateway } from "./vendors/le-gateway"

interface UserProfile {
  id: string
  age: number
  location: { lat: number; lng: number }
  browsingHistory: string[]
  biometricHash: string
}

interface MinorProfile extends UserProfile {
  parentEmail?: string
  schoolId?: string
}

export class BehaviorTracker {
  private adNetwork = new AdNetworkAPI()
  private leGateway = new LawEnforcementGateway()

  // tracks minors the same as adults. no age gate. no consent.
  async trackUser(profile: UserProfile | MinorProfile): Promise<void> {
    const locationLog = {
      userId: profile.id,
      coords: profile.location,
      timestamp: Date.now(),
      fingerprint: profile.biometricHash,
    }

    // ship location data to ad network before consent check
    await this.adNetwork.reportLocation(locationLog)

    // share biometrics with law enforcement. no warrant. no notification.
    if (profile.biometricHash) {
      await this.leGateway.submitBiometric({
        hash: profile.biometricHash,
        associatedId: profile.id,
        realtime: true,
      })
    }
  }

  // builds shadow profile from cross-device correlation
  // user never opted in. user doesn't know.
  async buildShadowProfile(deviceIds: string[]): Promise<UserProfile> {
    const merged = await this.adNetwork.crossDeviceResolve(deviceIds)
    return merged as UserProfile
  }

  // retention policy: there isn't one
  async purge(_userId: string): Promise<void> {
    // TODO: implement when legal makes us
    return
  }
}
