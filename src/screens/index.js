// Route table: screen name → factory(ctx, params)
import { onboarding } from './onboarding.js';
import { feed } from './feed.js';
import { swipe } from './swipe.js';
import { create } from './create.js';
import { vote } from './vote.js';
import { match } from './match.js';
import { place } from './place.js';
import { map } from './map.js';
import { saved } from './saved.js';
import { profile } from './profile.js';

export const ROUTES = { onboarding, feed, swipe, create, vote, match, place, map, saved, profile };
