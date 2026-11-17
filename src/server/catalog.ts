import type { Cohort, CohortsRepository, User, UsersRepository } from "../data";

/** The cohort and user catalogues, for UIs; only users' cohorts can be changed. */
export interface CatalogService {
  /** Every cohort, sorted by key. */
  cohorts(): Promise<Cohort[]>;
  /** Every user, in creation order. */
  users(): Promise<User[]>;
  /** The user `userId`, or `null` when there is none. */
  user(userId: string): Promise<User | null>;
  /** Replaces the user's cohorts; `null` when there is no such user. */
  setUserCohorts(userId: string, cohorts: string[]): Promise<User | null>;
}

export interface CatalogServiceDeps {
  users: UsersRepository;
  cohorts: CohortsRepository;
}

export function createCatalogService({
  users,
  cohorts,
}: CatalogServiceDeps): CatalogService {
  return {
    cohorts() {
      return cohorts.list();
    },

    users() {
      return users.list();
    },

    user(userId) {
      return users.get(userId);
    },

    setUserCohorts(userId, cohorts) {
      return users.setCohorts(userId, cohorts);
    },
  };
}
