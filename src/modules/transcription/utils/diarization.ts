
function cosineSimilarity(a: number[], b: number[]) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const den = Math.sqrt(normA) * Math.sqrt(normB);
    return den === 0 ? 0 : dot / den;
}

/**
 * Clusters transcription chunks based on speaker vectors (spk).
 * Labels chunks with "Speaker 1", "Speaker 2", etc.
 * Also groups consecutive chunks from the same speaker.
 */
export function clusterSegments(chunks: any[]) {
    if (!chunks || chunks.length === 0) return [];

    const SIMILARITY_THRESHOLD = 0.8;
    const clusters: { mean: number[], id: number }[] = [];
    let nextClusterId = 1;

    // 1. Assign speaker IDs to each chunk
    const chunksWithSpeakers = chunks.map(chunk => {
        if (!chunk.spk) return { ...chunk, speakerId: chunk.speaker || 'Unknown' };

        let bestCluster = -1;
        let maxSim = -1;

        for (let i = 0; i < clusters.length; i++) {
            const sim = cosineSimilarity(chunk.spk, clusters[i].mean);
            if (sim > maxSim) {
                maxSim = sim;
                bestCluster = i;
            }
        }

        let clusterId;
        if (maxSim > SIMILARITY_THRESHOLD) {
            clusterId = clusters[bestCluster].id;
            // Update mean
            for (let j = 0; j < chunk.spk.length; j++) {
                clusters[bestCluster].mean[j] = (clusters[bestCluster].mean[j] + chunk.spk[j]) / 2;
            }
        } else {
            clusterId = nextClusterId++;
            clusters.push({ mean: [...chunk.spk], id: clusterId });
        }

        return {
            ...chunk,
            speakerId: `Speaker ${clusterId}`
        };
    });

    // 2. Group consecutive chunks from the same speaker
    const segments: any[] = [];
    if (chunksWithSpeakers.length === 0) return [];

    let currentSegment = {
        speaker: chunksWithSpeakers[0].speakerId,
        text: chunksWithSpeakers[0].text,
        timestamp: [...chunksWithSpeakers[0].timestamp]
    };

    for (let i = 1; i < chunksWithSpeakers.length; i++) {
        const chunk = chunksWithSpeakers[i];
        if (chunk.speakerId === currentSegment.speaker) {
            // Append to current segment
            currentSegment.text += (chunk.text.match(/^[a-zA-Z0-9]/) ? ' ' : '') + chunk.text;
            currentSegment.timestamp[1] = chunk.timestamp[1];
        } else {
            // Start new segment
            segments.push(currentSegment);
            currentSegment = {
                speaker: chunk.speakerId,
                text: chunk.text,
                timestamp: [...chunk.timestamp]
            };
        }
    }
    segments.push(currentSegment);

    return segments;
}
