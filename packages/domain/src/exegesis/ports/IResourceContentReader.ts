/**
 * Read-only port the exegesis use cases use to fetch the extracted text
 * of a library resource. Just enough surface for the current generator —
 * a thin slice of the broader library repo that lives in infrastructure.
 *
 * Defined as a domain port so use cases stay free of any direct
 * dependency on the concrete `ILibraryRepository`. The infrastructure
 * layer adapts its repository to this interface in the composition root.
 */
export interface IResourceContentReader {
    /**
     * Returns the extracted text of a library_resource, or null if the
     * resource doesn't exist or hasn't been extracted yet.
     */
    getTextContent(resourceId: string): Promise<string | null>;
}
