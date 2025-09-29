export const prevPatchSql = `
  SELECT p2.patch
  FROM patches p1
  JOIN patches p2 ON p2.released_at = (
    SELECT max(released_at) FROM patches WHERE released_at < p1.released_at
  )
  WHERE p1.patch = $1
  LIMIT 1
`;

export const prevMajorMinorPatchSql = `
  SELECT p2.patch
  FROM patches p1
  JOIN patches p2 ON p2.major_minor = p1.major_minor
                 AND p2.released_at = (
                   SELECT max(released_at)
                   FROM patches
                   WHERE major_minor = p1.major_minor AND released_at < p1.released_at
                 )
  WHERE p1.patch = $1
  LIMIT 1
`;
