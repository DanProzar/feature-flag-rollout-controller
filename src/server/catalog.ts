import type { Cohort, CohortsRepository, User, UsersRepository } from "../data";

/** Read-only access to the cohort and user catalogues, for UIs. */
export interface CatalogService {
  /** Every cohort, sorted by key. */
  cohorts(): Promise<Cohort[]>;
  /** Every user, in creation order. */
  users(): Promise<User[]>;
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
  };
}
